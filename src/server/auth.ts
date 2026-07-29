import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequiredEnv } from "./config.js";

const tokenTtlMs = 1000 * 60 * 60 * 8;

interface AdminTokenPayload {
  sub: "admin";
  exp: number;
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getRequiredEnv("ADMIN_SESSION_SECRET")).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateAdminPassword(password: unknown) {
  return typeof password === "string" && password.length > 0 && safeEqual(password, getRequiredEnv("ADMIN_PASSWORD"));
}

export function createAdminToken() {
  const payload: AdminTokenPayload = {
    sub: "admin",
    exp: Date.now() + tokenTtlMs
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyAdminToken(token: string | null) {
  if (!token || !token.includes(".")) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminTokenPayload;
    return payload.sub === "admin" && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme.toLowerCase() === "bearer" ? token : null;
}
