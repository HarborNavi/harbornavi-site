import { sendLeadNotification } from "./notify.js";
import { syncWaitlistContact, type WaitlistContactConsentScope } from "./resend-contacts.js";
import { sendWaitlistConfirmation } from "./waitlist-email.js";
import {
  claimConfirmationEmail,
  claimContactSync,
  claimOperatorNotification,
  markConfirmationEmailFailed,
  markConfirmationEmailSent,
  markContactSynced,
  markContactSyncFailed,
  markOperatorNotificationFailed,
  markOperatorNotificationSent,
  type WaitlistIntegrationLead,
  waitlistIntegrationState
} from "./waitlist.js";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown integration error";
}

export async function deliverWaitlistConfirmation(leadId: string, baseUrl: string) {
  const lead = await claimConfirmationEmail(leadId);
  if (!lead) return { skipped: true as const, reason: "not_claimed" as const };

  const state = waitlistIntegrationState(lead);
  if (!state.consent_version || !state.consent_requested_at) {
    const message = "Waitlist consent metadata is incomplete";
    await markConfirmationEmailFailed(lead.id, message);
    throw new Error(message);
  }

  try {
    const result = await sendWaitlistConfirmation({
      leadId: lead.id,
      email: lead.email,
      consentVersion: state.consent_version,
      requestedAt: state.consent_requested_at,
      baseUrl
    });
    if (result.skipped) {
      throw new Error(`Waitlist confirmation skipped: ${result.reason}`);
    }
    await markConfirmationEmailSent(lead.id, result.id);
    return { skipped: false as const, provider_id: result.id };
  } catch (error) {
    await markConfirmationEmailFailed(lead.id, errorMessage(error));
    throw error;
  }
}

export async function syncConfirmedWaitlistLead(leadId: string) {
  const lead = await claimContactSync(leadId);
  if (!lead) return { skipped: true as const, reason: "not_claimed" as const };

  const state = waitlistIntegrationState(lead);
  const consentScope = state.consent_scope as WaitlistContactConsentScope | null;
  if (!consentScope || consentScope === "none") {
    const message = "Confirmed waitlist lead has no marketing consent scope";
    await markContactSyncFailed(lead.id, message);
    throw new Error(message);
  }

  try {
    const result = await syncWaitlistContact(lead.email, consentScope);
    if (result.skipped) {
      throw new Error(`Resend contact sync skipped: ${result.reason}`);
    }
    await markContactSynced(lead.id, result.topic_id);
    return { skipped: false as const, action: result.action, topic_id: result.topic_id };
  } catch (error) {
    await markContactSyncFailed(lead.id, errorMessage(error));
    throw error;
  }
}

export async function deliverOperatorNotification(leadId: string) {
  const lead = await claimOperatorNotification(leadId);
  if (!lead) return { skipped: true as const, reason: "not_claimed" as const };

  try {
    const result = await sendLeadNotification({
      id: lead.id,
      email: lead.email,
      route: lead.route || undefined,
      form_location: lead.form_location || undefined,
      path: lead.path || undefined,
      referrer: lead.referrer || undefined,
      utm_source: lead.utm_source || undefined,
      utm_campaign: lead.utm_campaign || undefined
    });
    if (result.skipped) {
      throw new Error("Operator notification skipped: not configured");
    }
    await markOperatorNotificationSent(lead.id);
    return { skipped: false as const };
  } catch (error) {
    await markOperatorNotificationFailed(lead.id, errorMessage(error));
    throw error;
  }
}

export function integrationSummary(lead: WaitlistIntegrationLead) {
  return {
    id: lead.id,
    email: lead.email,
    ...waitlistIntegrationState(lead)
  };
}
