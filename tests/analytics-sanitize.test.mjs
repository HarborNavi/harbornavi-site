import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAnalyticsProperties } from "../src/server/analytics-sanitize.ts";

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
