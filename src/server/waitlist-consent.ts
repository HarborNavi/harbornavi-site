import type { WaitlistContactConsentScope } from "./resend-contacts.js";

export const activeWaitlistRoute = "home-v6";
export const activeWaitlistConsentVersion = "home_v6_2026_07";
export const waitlistConsentVersions = {
  "home-v6": activeWaitlistConsentVersion,
  "home-v7": "home_v7_2026_07"
} as const;

export function normalizeWaitlistRoute(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 80) : "";
}

export function waitlistConsentVersionForRoute(route: string) {
  return waitlistConsentVersions[route as keyof typeof waitlistConsentVersions] || "";
}

export function waitlistRouteForConsentVersion(version: string) {
  return Object.entries(waitlistConsentVersions).find(([, candidate]) => candidate === version)?.[0] || "";
}

export function contactConsentScopeForRoute(route: string | null | undefined): WaitlistContactConsentScope {
  if (waitlistConsentVersionForRoute(route || "")) return "kickstarter_updates";
  return "none";
}

export function serverConsentMetadata(route: string, now = new Date()): Record<string, string> {
  const consentVersion = waitlistConsentVersionForRoute(route);
  if (!consentVersion) return {};
  return {
    consent_scope: "kickstarter_updates",
    consent_version: consentVersion,
    consent_requested_at: now.toISOString(),
    consent_status: "pending_confirmation"
  };
}
