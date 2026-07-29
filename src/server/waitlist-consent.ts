import type { WaitlistContactConsentScope } from "./resend-contacts.js";

export function normalizeWaitlistRoute(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 80) : "";
}

export function contactConsentScopeForRoute(route: string): WaitlistContactConsentScope {
  if (route === "home-v5") return "kickstarter_and_road_updates";
  if (route === "home-v4") return "kickstarter_updates";
  return "none";
}

export function serverConsentMetadata(route: string, now = new Date()): Record<string, string> {
  if (route !== "home-v5") return {};
  return {
    consent_scope: "kickstarter_and_road_updates",
    consent_version: "home_v5_2026_07",
    consent_at: now.toISOString()
  };
}
