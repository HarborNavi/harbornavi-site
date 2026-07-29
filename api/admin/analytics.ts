import { getAnalyticsDashboard } from "../../src/server/analytics.js";
import { getBearerToken, verifyAdminToken } from "../../src/server/auth.js";
import { jsonResponse } from "../../src/server/config.js";

export async function GET(request: Request) {
  if (!verifyAdminToken(getBearerToken(request))) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  try {
    const analytics = await getAnalyticsDashboard(url.searchParams.get("range"));
    return jsonResponse({ ok: true, analytics });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to load analytics" }, { status: 500 });
  }
}
