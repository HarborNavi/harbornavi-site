import { jsonResponse } from "../src/server/config.js";
import {
  deliverOperatorNotification,
  deliverWaitlistConfirmation
} from "../src/server/waitlist-integrations.js";
import {
  activeWaitlistConsentVersion,
  contactConsentScopeForRoute,
  normalizeWaitlistRoute,
  serverConsentMetadata
} from "../src/server/waitlist-consent.js";
import {
  normalizeEmail,
  prepareOperatorNotification,
  prepareWaitlistConsent,
  updateWaitlistProfile,
  upsertWaitlistLead,
  waitlistIntegrationState
} from "../src/server/waitlist.js";
import { waitlistConfirmationBaseUrl } from "../src/server/waitlist-email.js";
import { savePilotApplication } from "../src/server/pilot-applications.js";

export function OPTIONS() {
  return jsonResponse({ ok: true });
}

async function postWaitlistProfile(request: Request) {
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

async function postPilotApplication(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof payload.company === "string" && payload.company.trim()) return jsonResponse({ ok: true, ignored: true });
  try {
    const result = await savePilotApplication({
      name: payload.name,
      email: payload.email,
      zip_code: payload.zip_code,
      smart_devices: payload.smart_devices,
      interest_reason: payload.interest_reason,
      referral_source: payload.referral_source,
      metadata: {
        user_agent: request.headers.get("user-agent") || "",
        accept_language: request.headers.get("accept-language") || ""
      }
    });
    if ("error" in result) return jsonResponse({ error: result.error }, { status: 400 });
    return jsonResponse({ ok: true, application: result.application }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to save pilot application" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const action = new URL(request.url).searchParams.get("action");
  if (action === "pilot") return postPilotApplication(request);
  if (action === "profile") {
    return postWaitlistProfile(request);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Honeypot field. Bots often fill invisible inputs; humans should leave it empty.
  if (typeof payload.company === "string" && payload.company.trim()) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return jsonResponse({ error: "A valid email is required" }, { status: 400 });
  }

  const route = normalizeWaitlistRoute(payload.route);
  const consentScope = contactConsentScopeForRoute(route);
  const consentMetadata = serverConsentMetadata(route);
  const metadata: Record<string, string> = {
    user_agent: request.headers.get("user-agent") || "",
    accept_language: request.headers.get("accept-language") || ""
  };

  try {
    const lead = await upsertWaitlistLead({
      email,
      route,
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
      beta_intent: payload.beta_intent as string | undefined,
      metadata
    });

    if (consentScope !== "none") {
      const prepared = await prepareWaitlistConsent(
        lead.id,
        consentScope,
        consentMetadata.consent_version || activeWaitlistConsentVersion,
        consentMetadata.consent_requested_at || new Date().toISOString()
      );
      if (!prepared) throw new Error("Unable to prepare waitlist confirmation");

      let confirmationResult;
      try {
        confirmationResult = await deliverWaitlistConfirmation(
          prepared.id,
          waitlistConfirmationBaseUrl(request.url)
        );
      } catch (error) {
        console.error("Waitlist lead saved, but subscriber confirmation failed", error);
        return jsonResponse({
          error: "Your email was saved, but we could not send the confirmation email. Please try again.",
          code: "confirmation_delivery_failed",
          lead_saved: true,
          retryable: true
        }, { status: 503 });
      }

      const state = waitlistIntegrationState(prepared);
      if (
        confirmationResult.skipped &&
        !state.consent_confirmed_at &&
        !["sent", "sending"].includes(state.confirmation_email_status)
      ) {
        return jsonResponse({
          error: "Your email was saved, but we could not send the confirmation email. Please try again later.",
          code: "confirmation_delivery_unavailable",
          lead_saved: true,
          retryable: true
        }, { status: 503 });
      }

      return jsonResponse({
        ok: true,
        lead: {
          id: lead.id,
          email: lead.email,
          submission_count: lead.submission_count
        },
        subscription_status: state.consent_confirmed_at ? "confirmed" : "pending_confirmation",
        confirmation_email_sent: !confirmationResult.skipped,
        contact_sync_status: state.consent_confirmed_at ? state.contact_sync_status : "awaiting_confirmation"
      });
    }

    await prepareOperatorNotification(lead.id);
    let operatorNotificationStatus = "sent";
    try {
      const result = await deliverOperatorNotification(lead.id);
      if (result.skipped) operatorNotificationStatus = "already_processed";
    } catch (error) {
      operatorNotificationStatus = "failed";
      console.error("Waitlist lead saved, but operator notification failed", error);
    }

    return jsonResponse({
      ok: true,
      lead: {
        id: lead.id,
        email: lead.email,
        submission_count: lead.submission_count
      },
      subscription_status: "not_requested",
      operator_notification_status: operatorNotificationStatus
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to save waitlist lead" }, { status: 500 });
  }
}
