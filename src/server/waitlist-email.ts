import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { getOptionalEnv } from "./config.js";

const confirmationLifetimeSeconds = 7 * 24 * 60 * 60;
const resendApiUrl = "https://api.resend.com/emails";

interface ConfirmationTokenPayload {
  email: string;
  version: string;
  requested_at: string;
  exp: number;
}

interface SendConfirmationInput {
  leadId: string;
  email: string;
  consentVersion: string;
  requestedAt: string;
  baseUrl: string;
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getWaitlistConfirmationConfig() {
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  const from = getOptionalEnv("WAITLIST_CONFIRMATION_FROM_EMAIL") || getOptionalEnv("NOTIFY_FROM_EMAIL");
  const replyTo = getOptionalEnv("NOTIFY_TO_EMAIL");
  const secret = getOptionalEnv("WAITLIST_CONFIRMATION_SECRET");

  return {
    configured: Boolean(apiKey && from && secret && secret.length >= 32),
    apiKey,
    from,
    replyTo,
    secret,
    variables: {
      RESEND_API_KEY: Boolean(apiKey),
      WAITLIST_CONFIRMATION_FROM_EMAIL: Boolean(from),
      WAITLIST_CONFIRMATION_SECRET: Boolean(secret && secret.length >= 32)
    }
  };
}

export function createWaitlistConfirmationToken(
  payload: Omit<ConfirmationTokenPayload, "exp">,
  secret: string
) {
  const requestedAt = new Date(payload.requested_at);
  if (!Number.isFinite(requestedAt.getTime())) {
    throw new Error("Invalid waitlist consent request time");
  }

  const body = encode(JSON.stringify({
    ...payload,
    exp: Math.floor(requestedAt.getTime() / 1000) + confirmationLifetimeSeconds
  } satisfies ConfirmationTokenPayload));
  return `${body}.${signature(body, secret)}`;
}

export function verifyWaitlistConfirmationToken(token: string, secret: string, now = new Date()) {
  const [body, providedSignature, extra] = token.split(".");
  if (!body || !providedSignature || extra) return null;

  const expectedSignature = signature(body, secret);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ConfirmationTokenPayload;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.version !== "string" ||
      typeof parsed.requested_at !== "string" ||
      typeof parsed.exp !== "number" ||
      parsed.exp < Math.floor(now.getTime() / 1000)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function waitlistConfirmationBaseUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "harbornavi.com" ||
    hostname === "www.harbornavi.com" ||
    hostname === "127.0.0.1" ||
    hostname === "localhost" ||
    hostname.endsWith(".vercel.app")
  ) {
    return url.origin;
  }
  return getOptionalEnv("WAITLIST_PUBLIC_ORIGIN") || "https://harbornavi.com";
}

export async function sendWaitlistConfirmation(input: SendConfirmationInput) {
  const config = getWaitlistConfirmationConfig();
  if (!config.configured || !config.apiKey || !config.from || !config.secret) {
    return { skipped: true as const, reason: "not_configured" as const };
  }

  const token = createWaitlistConfirmationToken({
    email: input.email,
    version: input.consentVersion,
    requested_at: input.requestedAt
  }, config.secret);
  const confirmationUrl = new URL("/api/waitlist/confirm", input.baseUrl);
  confirmationUrl.searchParams.set("token", token);
  const safeUrl = escapeHtml(confirmationUrl.toString());
  const emailHash = createHash("sha256").update(input.email).digest("hex").slice(0, 24);
  const requestHash = createHash("sha256").update(input.requestedAt).digest("hex").slice(0, 16);

  const text = [
    "Confirm your HarborNavi launch-list email",
    "",
    "Please confirm that you want HarborNavi Kickstarter pre-launch updates:",
    confirmationUrl.toString(),
    "",
    "This link expires in 7 days. If you did not request this, ignore this email and you will not be subscribed.",
    "To request deletion of the pending address, reply to this email."
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#f7f7fa;color:#171724;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">
    <p style="font-size:14px;font-weight:700;color:#5b42c2">HarborNavi</p>
    <h1 style="font-size:28px;line-height:1.2;margin:20px 0 12px">Confirm your launch-list email</h1>
    <p style="font-size:16px;line-height:1.6">Please confirm that you want HarborNavi Kickstarter pre-launch updates.</p>
    <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;background:#171724;color:#fff;text-decoration:none;padding:14px 20px;border-radius:6px;font-weight:700">Confirm my email</a></p>
    <p style="font-size:14px;line-height:1.6;color:#5d5d69">This link expires in 7 days. If you did not request this, ignore this email and you will not be subscribed.</p>
    <p style="font-size:14px;line-height:1.6;color:#5d5d69">To request deletion of the pending address, reply to this email.</p>
  </div>
</body></html>`;

  const response = await fetch(resendApiUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `waitlist-confirmation/${input.leadId}/${emailHash}/${requestHash}`
    },
    body: JSON.stringify({
      from: config.from,
      to: input.email,
      reply_to: config.replyTo,
      subject: "Confirm your HarborNavi launch-list email",
      text,
      html,
      tags: [
        { name: "message_type", value: "waitlist_confirmation" },
        { name: "consent_version", value: input.consentVersion.replaceAll(/[^a-zA-Z0-9_-]/g, "_") }
      ]
    }),
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(`Resend confirmation failed: ${response.status} ${message}`);
  }

  const body = await response.json() as { id?: string };
  return { skipped: false as const, id: body.id || null };
}
