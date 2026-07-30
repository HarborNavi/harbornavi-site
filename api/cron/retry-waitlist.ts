import { getOptionalEnv, jsonResponse } from "../../src/server/config.js";
import { getKickstarterTopic } from "../../src/server/resend-contacts.js";
import { contactConsentScopeForRoute } from "../../src/server/waitlist-consent.js";
import {
  deliverOperatorNotification,
  deliverWaitlistConfirmation,
  syncConfirmedWaitlistLead
} from "../../src/server/waitlist-integrations.js";
import {
  listRetryableWaitlistIntegrations,
  purgeExpiredUnconfirmedWaitlistLeads,
  waitlistIntegrationState
} from "../../src/server/waitlist.js";

export async function GET(request: Request) {
  const cronSecret = getOptionalEnv("CRON_SECRET");
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = getOptionalEnv("WAITLIST_PUBLIC_ORIGIN") || "https://harbornavi.com";
  const results: Array<{ id: string; service: string; status: string }> = [];

  try {
    const topic = await getKickstarterTopic({ createIfMissing: true });
    if (!topic) throw new Error("Unable to initialize the Resend Kickstarter topic");

    const leads = await listRetryableWaitlistIntegrations(50);
    for (const lead of leads) {
      const state = waitlistIntegrationState(lead);

      if (
        !state.consent_confirmed_at &&
        ["pending", "failed", "sending"].includes(state.confirmation_email_status)
      ) {
        try {
          const result = await deliverWaitlistConfirmation(lead.id, baseUrl);
          results.push({ id: lead.id, service: "confirmation", status: result.skipped ? "skipped" : "sent" });
        } catch (error) {
          console.error("Waitlist confirmation retry failed", lead.id, error);
          results.push({ id: lead.id, service: "confirmation", status: "failed" });
        }
      }

      if (
        state.consent_confirmed_at &&
        ["pending", "failed", "sending"].includes(state.contact_sync_status)
      ) {
        try {
          const result = await syncConfirmedWaitlistLead(lead.id);
          results.push({ id: lead.id, service: "contact_sync", status: result.skipped ? "skipped" : "synced" });
        } catch (error) {
          console.error("Waitlist contact retry failed", lead.id, error);
          results.push({ id: lead.id, service: "contact_sync", status: "failed" });
        }
      }

      if (
        (contactConsentScopeForRoute(lead.route) === "none" || state.consent_confirmed_at) &&
        ["pending", "failed", "sending"].includes(state.operator_notification_status)
      ) {
        try {
          const result = await deliverOperatorNotification(lead.id);
          results.push({ id: lead.id, service: "operator_notification", status: result.skipped ? "skipped" : "sent" });
        } catch (error) {
          console.error("Operator notification retry failed", lead.id, error);
          results.push({ id: lead.id, service: "operator_notification", status: "failed" });
        }
      }
    }

    const purged = await purgeExpiredUnconfirmedWaitlistLeads(30);
    return jsonResponse({
      ok: true,
      topic: {
        id: topic.id,
        name: topic.name,
        default_subscription: topic.default_subscription || null
      },
      candidates: leads.length,
      processed: results.length,
      purged,
      results
    });
  } catch (error) {
    console.error("Waitlist retry job failed", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Waitlist retry job failed"
    }, { status: 503 });
  }
}
