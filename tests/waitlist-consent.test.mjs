import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  activeWaitlistConsentVersion,
  activeWaitlistRoute,
  contactConsentScopeForRoute,
  normalizeWaitlistRoute,
  serverConsentMetadata
} from "../src/server/waitlist-consent.ts";

test("only home-v6 receives the Kickstarter consent scope", () => {
  assert.equal(activeWaitlistRoute, "home-v6");
  assert.equal(activeWaitlistConsentVersion, "home_v6_2026_07");
  assert.equal(normalizeWaitlistRoute("  HOME-V6  "), "home-v6");
  assert.equal(contactConsentScopeForRoute("home-v6"), "kickstarter_updates");
  assert.equal(contactConsentScopeForRoute("home-v5"), "none");
  assert.equal(contactConsentScopeForRoute("home-v4"), "none");
  assert.equal(contactConsentScopeForRoute("home-v2"), "none");
  assert.equal(contactConsentScopeForRoute("unknown"), "none");
});

test("home-v6 pending-confirmation metadata is fixed by the server", () => {
  const now = new Date("2026-07-15T00:00:00.000Z");
  assert.deepEqual(serverConsentMetadata("home-v6", now), {
    consent_scope: "kickstarter_updates",
    consent_version: "home_v6_2026_07",
    consent_requested_at: "2026-07-15T00:00:00.000Z",
    consent_status: "pending_confirmation"
  });
  assert.deepEqual(serverConsentMetadata("home-v5", now), {});
  assert.deepEqual(serverConsentMetadata("home-v4", now), {});
});

test("dynamic JSONB metadata values declare their PostgreSQL type", async () => {
  const source = await readFile(new URL("../src/server/waitlist.ts", import.meta.url), "utf8");
  const typedValues = [
    "consentScope",
    "consentVersion",
    "requestedAt",
    "providerId",
    "topicId"
  ];

  for (const value of typedValues) {
    assert.match(source, new RegExp(`\\$\\{${value}\\}::text`));
  }
  assert.equal((source.match(/\$\{error\.slice\(0, 500\)\}::text/g) || []).length, 3);
});
