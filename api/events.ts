import { jsonResponse } from "../src/server/config.js";
import { recordAnalyticsEvent } from "../src/server/analytics.js";

export function OPTIONS() {
  return jsonResponse({ ok: true });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await recordAnalyticsEvent(payload);
    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to record event" }, { status: 500 });
  }
}
