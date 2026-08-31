import type { WaitlistContactConsentScope } from "./resend-contacts.js";

export const activeWaitlistRoute = "home-v9";
export const activeWaitlistConsentVersion = "home_v9_2026_08";
export const waitlistConsentVersions = {
  "home-v6": "home_v6_2026_07",
  "home-v7": "home_v7_2026_07",
  "home-v8": "home_v8_2026_08",
  "home-v9": activeWaitlistConsentVersion
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
  const submittedAt = now.toISOString();
  return {
    consent_scope: "kickstarter_updates",
    consent_version: consentVersion,
    consent_requested_at: submittedAt,
    consent_confirmed_at: submittedAt,
    consent_status: "confirmed"
  };
}
