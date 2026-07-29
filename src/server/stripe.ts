import { createHmac, timingSafeEqual } from "node:crypto";
import { getOptionalEnv } from "./config.js";

const stripeApiBase = "https://api.stripe.com/v1";
const reservationAmountCents = 1000;

interface StripeErrorBody {
  error?: {
    message?: string;
  };
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired" | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  payment_intent: string | null;
  customer: string | null;
  client_reference_id: string | null;
  metadata?: Record<string, string>;
}

export interface StripeRefund {
  id: string;
  status: "pending" | "requires_action" | "succeeded" | "failed" | "canceled" | null;
  payment_intent: string | null;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export function getFounderReservationConfig() {
  const enabledFlag = getOptionalEnv("FOUNDER_RESERVATION_ENABLED") === "true";
  const secretKeyReady = Boolean(getOptionalEnv("STRIPE_SECRET_KEY"));
  const webhookReady = Boolean(getOptionalEnv("STRIPE_WEBHOOK_SECRET"));
  const refundAt = getOptionalEnv("FOUNDER_RESERVATION_REFUND_AT");

  return {
    enabled: enabledFlag && secretKeyReady && webhookReady,
    enabled_flag: enabledFlag,
    secret_key_ready: secretKeyReady,
    webhook_ready: webhookReady,
    amount_cents: reservationAmountCents,
    currency: "usd",
    founder_price: 419,
    kickstarter_price: 449,
    expected_retail_price: 549,
    founder_quantity: 100,
    refund_at: refundAt || null
  };
}

function getStripeSecretKey() {
  const key = getOptionalEnv("STRIPE_SECRET_KEY");
  if (!key) {
    throw new Error("Stripe is not configured");
  }
  return key;
}

async function stripeRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${stripeApiBase}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${getStripeSecretKey()}`,
      ...(init.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(init.headers || {})
    }
  });
  const body = (await response.json().catch(() => ({}))) as T & StripeErrorBody;
  if (!response.ok) {
    throw new Error(body.error?.message || `Stripe request failed with ${response.status}`);
  }
  return body as T;
}

export async function createFounderCheckoutSession(input: {
  reservationId: string;
  leadId: string;
  email: string;
  origin: string;
}) {
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("payment_method_types[0]", "card");
  body.set("customer_email", input.email);
  body.set("client_reference_id", input.reservationId);
  body.set("success_url", `${input.origin}/home-v4?reservation=success&session_id={CHECKOUT_SESSION_ID}#early-access`);
  body.set("cancel_url", `${input.origin}/home-v4?reservation=cancelled#early-access`);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(reservationAmountCents));
  body.set("line_items[0][price_data][product_data][name]", "HarborNavi Founder priority reservation");
  body.set(
    "line_items[0][price_data][product_data][description]",
    "Fully refundable priority access to the limited $419 Founder reward. This is not a Kickstarter pledge and does not guarantee a unit."
  );
  body.set("metadata[reservation_id]", input.reservationId);
  body.set("metadata[lead_id]", input.leadId);
  body.set("payment_intent_data[metadata][reservation_id]", input.reservationId);
  body.set("payment_intent_data[metadata][lead_id]", input.leadId);

  return stripeRequest<StripeCheckoutSession>("/checkout/sessions", {
    method: "POST",
    body
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  return stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET"
  });
}

export async function createStripeRefund(paymentIntentId: string) {
  const body = new URLSearchParams();
  body.set("payment_intent", paymentIntentId);
  body.set("reason", "requested_by_customer");
  return stripeRequest<StripeRefund>("/refunds", { method: "POST", body });
}

function safeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null) {
  const secret = getOptionalEnv("STRIPE_WEBHOOK_SECRET");
  if (!secret || !signatureHeader) {
    return null;
  }

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t") timestamp = value || "";
    if (key === "v1" && value) signatures.push(value);
  }

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!signatures.some((signature) => safeHexEqual(signature, expected))) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as StripeEvent;
  } catch {
    return null;
  }
}
