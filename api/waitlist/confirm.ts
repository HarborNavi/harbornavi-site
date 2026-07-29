import { activeWaitlistConsentVersion } from "../../src/server/waitlist-consent.js";
import {
  deliverOperatorNotification,
  syncConfirmedWaitlistLead
} from "../../src/server/waitlist-integrations.js";
import {
  getWaitlistConfirmationConfig,
  verifyWaitlistConfirmationToken
} from "../../src/server/waitlist-email.js";
import {
  confirmWaitlistConsent,
  normalizeEmail,
  prepareOperatorNotification
} from "../../src/server/waitlist.js";

function redirectToLanding(status: string) {
  return new Response(null, {
    status: 303,
    headers: {
      location: `/home-v6?confirmation=${encodeURIComponent(status)}#join`,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer"
    }
  });
}

export async function GET(request: Request) {
  const config = getWaitlistConfirmationConfig();
  if (!config.configured || !config.secret) {
    console.error("Waitlist confirmation endpoint is not configured");
    return redirectToLanding("service-error");
  }

  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = verifyWaitlistConfirmationToken(token, config.secret);
  const email = normalizeEmail(payload?.email);
  if (!payload || !email || payload.version !== activeWaitlistConsentVersion) {
    return redirectToLanding("invalid");
  }

  try {
    const lead = await confirmWaitlistConsent(email, payload.version);
    if (!lead) return redirectToLanding("invalid");

    await prepareOperatorNotification(lead.id);
    const [contactResult, operatorResult] = await Promise.allSettled([
      syncConfirmedWaitlistLead(lead.id),
      deliverOperatorNotification(lead.id)
    ]);

    if (operatorResult.status === "rejected") {
      console.error("Waitlist confirmed, but operator notification failed", operatorResult.reason);
    }
    if (contactResult.status === "rejected") {
      console.error("Waitlist confirmed, but Resend contact sync failed", contactResult.reason);
      return redirectToLanding("sync-failed");
    }

    return redirectToLanding("confirmed");
  } catch (error) {
    console.error("Unable to confirm waitlist subscription", error);
    return redirectToLanding("service-error");
  }
}
