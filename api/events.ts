import { jsonResponse } from "../src/server/config.js";
import { recordAnalyticsEvent } from "../src/server/analytics.js";
import { resolveVisitorId, visitorCookieHeader } from "../src/server/visitor-id.js";

export function OPTIONS() {
  return jsonResponse({ ok: true });
}

export async function GET() {
  return jsonResponse(
    { error: "Method not allowed" },
    { status: 405, headers: { allow: "OPTIONS, POST" } }
  );
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const visitor = resolveVisitorId(request);
    const result = await recordAnalyticsEvent(payload, visitor.id);
    return jsonResponse(
      { ok: true, ...result },
      { headers: { "set-cookie": visitorCookieHeader(visitor.id, request.url) } }
    );
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to record event" }, { status: 500 });
  }
}
