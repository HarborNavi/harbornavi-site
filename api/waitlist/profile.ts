import { jsonResponse } from "../../src/server/config.js";
import { normalizeEmail, updateWaitlistProfile } from "../../src/server/waitlist.js";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return jsonResponse({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const lead = await updateWaitlistProfile({
      email,
      route: payload.route as string | undefined,
      form_location: payload.form_location as string | undefined,
      path: payload.path as string | undefined,
      referrer: payload.referrer as string | undefined,
      utm_source: payload.utm_source as string | undefined,
      utm_medium: payload.utm_medium as string | undefined,
      utm_campaign: payload.utm_campaign as string | undefined,
      utm_content: payload.utm_content as string | undefined,
      utm_term: payload.utm_term as string | undefined,
      primary_interest: payload.primary_interest as string | undefined,
      camera_setup: payload.camera_setup as string | undefined,
      camera_brands: payload.camera_brands as string[] | undefined,
      camera_models: payload.camera_models as string | undefined,
      camera_connection: payload.camera_connection as string | undefined,
      beta_intent: payload.beta_intent as string | undefined,
      price_intent: payload.price_intent as string | undefined,
      purchase_blocker: payload.purchase_blocker as string | undefined,
      metadata: {
        user_agent: request.headers.get("user-agent") || "",
        accept_language: request.headers.get("accept-language") || ""
      }
    });

    return jsonResponse({
      ok: true,
      lead: {
        id: lead.id,
        email: lead.email,
        primary_interest: lead.primary_interest,
        camera_brands: lead.camera_brands,
        camera_connection: lead.camera_connection,
        beta_intent: lead.beta_intent,
        price_intent: lead.price_intent,
        purchase_blocker: lead.purchase_blocker,
        founder_reservation_status: lead.founder_reservation_status,
        profile_completed_at: lead.profile_completed_at
      }
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to save profile" }, { status: 500 });
  }
}
