import assert from "node:assert/strict";
import test from "node:test";

import {
  publicWaitlistBaseline,
  publicWaitlistPeople
} from "../src/server/public-waitlist.ts";

test("public waitlist starts at 509 and adds unique post-launch leads", () => {
  assert.equal(publicWaitlistBaseline, 509);
  assert.equal(publicWaitlistPeople(0), 509);
  assert.equal(publicWaitlistPeople(1), 510);
  assert.equal(publicWaitlistPeople("2"), 511);
  assert.equal(publicWaitlistPeople(-4), 509);
  assert.equal(publicWaitlistPeople("invalid"), 509);
});
