import { randomUUID } from "node:crypto";

export const visitorCookieName = "harbornavi_visitor_id";

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") || "";
  for (const part of cookies.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

function validVisitorId(value: string) {
  return /^[a-f0-9-]{36}$/i.test(value) ? value : "";
}

export function resolveVisitorId(request: Request) {
  const existing = validVisitorId(cookieValue(request, visitorCookieName));
  return {
    id: existing || randomUUID(),
    isNew: !existing
  };
}

export function visitorCookieHeader(visitorId: string, requestUrl: string) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${visitorCookieName}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`;
}
