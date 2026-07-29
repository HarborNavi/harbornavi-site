import { createAdminToken, validateAdminPassword } from "../../src/server/auth.js";
import { jsonResponse } from "../../src/server/config.js";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (!validateAdminPassword(payload.password)) {
      return jsonResponse({ error: "Invalid password" }, { status: 401 });
    }

    return jsonResponse({
      ok: true,
      token: createAdminToken()
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Admin login is not configured" }, { status: 500 });
  }
}
