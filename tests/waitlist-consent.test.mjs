import assert from "node:assert/strict";
import test from "node:test";

import {
  contactConsentScopeForRoute,
  normalizeWaitlistRoute,
  serverConsentMetadata
} from "../src/server/waitlist-consent.ts";

test("only home-v5 receives the combined Kickstarter and road consent scope", () => {
  assert.equal(normalizeWaitlistRoute("  HOME-V5  "), "home-v5");
  assert.equal(contactConsentScopeForRoute("home-v5"), "kickstarter_and_road_updates");
  assert.equal(contactConsentScopeForRoute("home-v4"), "kickstarter_updates");
  assert.equal(contactConsentScopeForRoute("home-v2"), "none");
  assert.equal(contactConsentScopeForRoute("unknown"), "none");
});

test("home-v5 consent metadata is fixed by the server", () => {
  const now = new Date("2026-07-15T00:00:00.000Z");
  assert.deepEqual(serverConsentMetadata("home-v5", now), {
    consent_scope: "kickstarter_and_road_updates",
    consent_version: "home_v5_2026_07",
    consent_at: "2026-07-15T00:00:00.000Z"
  });
  assert.deepEqual(serverConsentMetadata("home-v4", now), {});
});
