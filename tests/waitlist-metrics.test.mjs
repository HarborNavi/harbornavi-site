import assert from "node:assert/strict";
import test from "node:test";

import {
  privateWaitlistPeople,
  resolvePrivateWaitlistConfig
} from "../src/server/waitlist-metrics.ts";

test("private waitlist config accepts server-provided values", () => {
  assert.deepEqual(
    resolvePrivateWaitlistConfig({
      WAITLIST_PRIVATE_BASELINE: "600",
      WAITLIST_PRIVATE_BASELINE_STARTED_AT: "2026-01-02T03:04:05Z"
    }),
    { baseline: 600, startedAt: "2026-01-02T03:04:05Z" }
  );
});

test("private waitlist config fails closed for missing or invalid values", () => {
  assert.throws(() => resolvePrivateWaitlistConfig({}), /WAITLIST_PRIVATE_BASELINE/);
  assert.throws(
    () => resolvePrivateWaitlistConfig({
      WAITLIST_PRIVATE_BASELINE: "-1",
      WAITLIST_PRIVATE_BASELINE_STARTED_AT: "2026-01-02T03:04:05Z"
    }),
    /WAITLIST_PRIVATE_BASELINE/
  );
  assert.throws(
    () => resolvePrivateWaitlistConfig({
      WAITLIST_PRIVATE_BASELINE: "600",
      WAITLIST_PRIVATE_BASELINE_STARTED_AT: "not-a-date"
    }),
    /WAITLIST_PRIVATE_BASELINE_STARTED_AT/
  );
});

test("private waitlist total adds only finite non-negative whole people", () => {
  assert.equal(privateWaitlistPeople(600, 0), 600);
  assert.equal(privateWaitlistPeople(600, 1), 601);
  assert.equal(privateWaitlistPeople(600, "2"), 602);
  assert.equal(privateWaitlistPeople(600, -4), 600);
  assert.equal(privateWaitlistPeople(600, "invalid"), 600);
});
