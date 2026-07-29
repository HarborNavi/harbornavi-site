import { getBearerToken, verifyAdminToken } from "../../src/server/auth.js";
import { jsonResponse } from "../../src/server/config.js";
import { updateWaitlistLead } from "../../src/server/waitlist.js";

export async function POST(request: Request) {
  if (!verifyAdminToken(getBearerToken(request))) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const lead = await updateWaitlistLead(payload.id, payload.status, payload.notes);
    if (!lead) {
      return jsonResponse({ error: "Lead not found" }, { status: 404 });
    }
    return jsonResponse({ ok: true, lead });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to update lead" }, { status: 500 });
  }
}
