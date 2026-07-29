import type { WaitlistContactConsentScope } from "./resend-contacts.js";

export const activeWaitlistRoute = "home-v6";
export const activeWaitlistConsentVersion = "home_v6_2026_07";

export function normalizeWaitlistRoute(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 80) : "";
}

export function contactConsentScopeForRoute(route: string): WaitlistContactConsentScope {
  if (route === activeWaitlistRoute) return "kickstarter_updates";
  return "none";
}

export function serverConsentMetadata(route: string, now = new Date()): Record<string, string> {
  if (route !== activeWaitlistRoute) return {};
  return {
    consent_scope: "kickstarter_updates",
    consent_version: activeWaitlistConsentVersion,
    consent_requested_at: now.toISOString(),
    consent_status: "pending_confirmation"
  };
}
