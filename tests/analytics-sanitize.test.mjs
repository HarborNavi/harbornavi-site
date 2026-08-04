import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAnalyticsProperties } from "../src/server/analytics-sanitize.ts";
import {
  resolveVisitorId,
  visitorCookieHeader,
  visitorCookieName
} from "../src/server/visitor-id.ts";

test("campaign analytics strips PII-like application fields and keeps safe attribution", () => {
  const result = sanitizeAnalyticsProperties({
    link_kind: "application",
    completion_source: "thanks_page",
    filming_preference: "comfortable",
    recording_choice: "yes",
    consent_answer: "agreed",
    application_response: "long free text",
    email: "person@example.com",
    postal_code: "12345",
    applicant_name: "Private person",
    metro_area: "Private metro",
    camera_model: "private model",
    device_identifier: "private id"
  });

  assert.deepEqual(result, {
    link_kind: "application",
    completion_source: "thanks_page"
  });
});

test("visitor identity is stable in the first-party cookie and remains anonymous", () => {
  const first = resolveVisitorId(new Request("https://harbornavi.com/home-v7"));
  assert.equal(first.isNew, true);
  assert.match(first.id, /^[a-f0-9-]{36}$/);

  const cookie = visitorCookieHeader(first.id, "https://harbornavi.com/api/events");
  assert.match(cookie, new RegExp(`^${visitorCookieName}=`));
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);

  const returning = resolveVisitorId(new Request("https://harbornavi.com/home-v7", {
    headers: { cookie: `${visitorCookieName}=${first.id}` }
  }));
  assert.deepEqual(returning, { id: first.id, isNew: false });
});
