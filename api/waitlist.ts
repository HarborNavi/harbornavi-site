import { jsonResponse } from "../src/server/config.js";
import { sendLeadNotification } from "../src/server/notify.js";
import { syncWaitlistContact } from "../src/server/resend-contacts.js";
import {
  contactConsentScopeForRoute,
  normalizeWaitlistRoute,
  serverConsentMetadata
} from "../src/server/waitlist-consent.js";
import { normalizeEmail, upsertWaitlistLead } from "../src/server/waitlist.js";

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
  const metadata: Record<string, string> = {
    user_agent: request.headers.get("user-agent") || "",
    accept_language: request.headers.get("accept-language") || "",
    ...serverConsentMetadata(route)
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

    const [contactSyncResult, notificationResult] = await Promise.allSettled([
      syncWaitlistContact(email, consentScope),
      sendLeadNotification({
        email,
        route,
        form_location: payload.form_location as string | undefined,
        path: payload.path as string | undefined,
        referrer: payload.referrer as string | undefined,
        utm_source: payload.utm_source as string | undefined,
        utm_campaign: payload.utm_campaign as string | undefined
      })
    ]);

    if (contactSyncResult.status === "rejected") {
      console.error("Waitlist lead saved, but Resend contact sync failed", contactSyncResult.reason);
    }
    if (notificationResult.status === "rejected") {
      console.error("Waitlist lead saved, but operator notification failed", notificationResult.reason);
    }

    const contactSyncSkipped = contactSyncResult.status !== "fulfilled" || contactSyncResult.value.skipped;
    const notificationSkipped = notificationResult.status !== "fulfilled" || notificationResult.value.skipped;

    return jsonResponse({
      ok: true,
      lead: {
        id: lead.id,
        email: lead.email,
        submission_count: lead.submission_count
      },
      contact_sync_skipped: contactSyncSkipped,
      notification_skipped: notificationSkipped
    });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to save waitlist lead" }, { status: 500 });
  }
}
