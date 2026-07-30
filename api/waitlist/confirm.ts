import {
  activeWaitlistRoute,
  waitlistRouteForConsentVersion
} from "../../src/server/waitlist-consent.js";
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

function redirectToLanding(status: string, route = activeWaitlistRoute) {
  return new Response(null, {
    status: 303,
    headers: {
      location: `/${route}?confirmation=${encodeURIComponent(status)}#join`,
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
  const landingRoute = waitlistRouteForConsentVersion(payload?.version || "");
  if (!payload || !email || !landingRoute) {
    return redirectToLanding("invalid");
  }

  try {
    const lead = await confirmWaitlistConsent(email, payload.version);
    if (!lead) return redirectToLanding("invalid", landingRoute);

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
      return redirectToLanding("sync-failed", landingRoute);
    }

    return redirectToLanding("confirmed", landingRoute);
  } catch (error) {
    console.error("Unable to confirm waitlist subscription", error);
    return redirectToLanding("service-error", landingRoute);
  }
}
