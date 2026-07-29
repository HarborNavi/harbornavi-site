import { getBearerToken, verifyAdminToken } from "../../src/server/auth.js";
import { jsonResponse } from "../../src/server/config.js";
import { listWaitlistLeads } from "../../src/server/waitlist.js";

export async function GET(request: Request) {
  if (!verifyAdminToken(getBearerToken(request))) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await listWaitlistLeads();
    return jsonResponse({ ok: true, leads });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to load leads" }, { status: 500 });
  }
}
