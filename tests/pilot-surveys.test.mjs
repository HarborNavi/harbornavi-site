import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { pilotSurveyScoreVersion, validatePilotSurvey } from "../src/server/pilot-survey-validation.ts";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

function validSurvey(overrides = {}) {
  return {
    name: "Taylor Morgan",
    email: "taylor@example.com",
    adult_confirmed: true,
    stable_wifi_confirmed: true,
    compatible_device_confirmed: true,
    pilot_commitment_confirmed: true,
    selection_acknowledged: true,
    on_camera_willingness: "comfortable",
    filming_ability: "experienced",
    audience_level: "consistent",
    story_sample: "Last week our front camera reported a package while the door sensor and porch light each sent separate alerts. I would show the three notifications, explain why nobody knew the full situation, and compare that confusion with one calm household update that tells us what actually changed and what needs attention.",
    core_scenarios: ["security", "automation", "privacy", "family_memory"],
    household_context: ["deliveries_visitors", "multiple_users"],
    device_categories: ["home_assistant", "rtsp_onvif_camera", "sensors"],
    available_windows: ["weekday_evening", "weekend_morning"],
    scheduling_confidence: "reliable",
    completion_commitment: "full",
    past_participation_level: "formal",
    referral_source: "reddit",
    accuracy_confirmed: true,
    review_contact_confirmed: true,
    disclosure_confirmed: true,
    no_marketing_acknowledged: true,
    ...overrides
  };
}

test("pilot survey validates and produces the maximum server-side score", () => {
  const result = validatePilotSurvey(validSurvey());
  assert.ok("application" in result);
  assert.deepEqual(result.score, {
    content_score: 30,
    scenario_score: 45,
    reliability_score: 25,
    total_score: 100,
    score_band: "priority",
    score_version: pilotSurveyScoreVersion,
    automatic_summary: result.score.automatic_summary
  });
  assert.match(result.score.automatic_summary, /Content:/);
  assert.match(result.score.automatic_summary, /Fit:/);
  assert.match(result.score.automatic_summary, /Reliability:/);
});

test("pilot survey scoring stays deterministic for a conditional household", () => {
  const result = validatePilotSurvey(validSurvey({
    on_camera_willingness: "depends",
    filming_ability: "phone",
    audience_level: "limited",
    story_sample: "A camera alert arrived, but our family still had to open several apps to understand it.",
    core_scenarios: ["security", "privacy"],
    household_context: [],
    device_categories: ["other_camera", "sensors"],
    available_windows: ["flexible"],
    scheduling_confidence: "coordinate",
    completion_commitment: "adjustment",
    past_participation_level: "comparable"
  }));
  assert.ok("application" in result);
  assert.equal(result.score.content_score, 16);
  assert.equal(result.score.scenario_score, 21);
  assert.equal(result.score.reliability_score, 13);
  assert.equal(result.score.total_score, 50);
  assert.equal(result.score.score_band, "conditional");
});

test("pilot survey rejects missing confirmations and conflicting exclusive choices", () => {
  assert.deepEqual(validatePilotSurvey(validSurvey({ stable_wifi_confirmed: false })), {
    error: "Stable home Wi-Fi is required for this pilot."
  });
  assert.deepEqual(validatePilotSurvey(validSurvey({ core_scenarios: ["security", "none"] })), {
    error: "Choose either a HarborNavi scenario or none of these."
  });
  assert.deepEqual(validatePilotSurvey(validSurvey({ household_context: ["pets", "prefer_not_to_say"] })), {
    error: "Choose either household situations or prefer not to say."
  });
});

test("pilot survey page follows the approved 16-question contract", async () => {
  const [page, styles] = await Promise.all([
    source("src/pages/pilotsurvey.astro"),
    source("src/styles/pilot-survey.css")
  ]);
  for (const field of [
    "name",
    "email",
    "adult_confirmed",
    "stable_wifi_confirmed",
    "compatible_device_confirmed",
    "pilot_commitment_confirmed",
    "selection_acknowledged",
    "on_camera_willingness",
    "filming_ability",
    "audience_level",
    "story_sample",
    "core_scenarios",
    "household_context",
    "device_categories",
    "available_windows",
    "scheduling_confidence",
    "completion_commitment",
    "past_participation_level",
    "referral_source",
    "accuracy_confirmed",
    "review_contact_confirmed",
    "disclosure_confirmed",
    "no_marketing_acknowledged"
  ]) {
    assert.match(page, new RegExp(`name="${field}"`));
  }
  for (const removedField of [
    "zip_code",
    "time_zone",
    "public_profile_details",
    "device_setup_details",
    "pain_point_story",
    "past_participation_example",
    "participation_support"
  ]) {
    assert.doesNotMatch(page, new RegExp(`name="${removedField}"`));
  }
  assert.match(page, /This questionnaire is part of our selection process/);
  assert.match(page, /constructive, balanced, and objective feedback/);
  assert.match(page, /complete this round of questionnaire collection within one week/);
  assert.match(page, /data-survey-success aria-labelledby="survey-success-title"/);
  assert.match(page, /Please keep an eye on your inbox for selection updates and next steps/);
  assert.match(page, /success\.showModal\(\)/);
  assert.match(page, /<textarea name="story_sample" rows="6" required><\/textarea>/);
  assert.doesNotMatch(page, /100[–-]200 words|name="story_sample"[^>]*(?:minlength|maxlength)/);
  assert.match(page, /fetch\("\/api\/pilot-survey"/);
  assert.doesNotMatch(page, /total_score|content_score|scenario_score|reliability_score/);
  assert.match(page, /harbornavi-logo-mark\.png/);
  assert.match(styles, /--survey-purple: #6d3bd1/);
  assert.match(styles, /--survey-white: #ffffff/);
  assert.match(styles, /@media \(max-width: 680px\)/);
});

test("pilot survey API, admin, privacy, and migration contracts stay connected", async () => {
  const [waitlistApi, adminApi, adminPage, privacy, migration, vercel] = await Promise.all([
    source("api/waitlist.ts"),
    source("api/admin/health.ts"),
    source("src/pages/admin666.astro"),
    source("src/pages/privacy.astro"),
    source("db/pilot-surveys.sql"),
    source("vercel.json").then(JSON.parse)
  ]);
  assert.match(waitlistApi, /savePilotSurvey/);
  assert.match(waitlistApi, /action === "pilot-survey"/);
  assert.match(adminApi, /listPilotSurveys/);
  assert.match(adminApi, /action === "pilot-surveys"/);
  assert.match(adminPage, /data-tab-button="pilot-surveys">Pilot Surveys/);
  assert.match(adminPage, /data-tab-panel="pilot-surveys"/);
  assert.match(adminPage, /Automatic summary/);
  assert.match(adminPage, /exportPilotSurveysCsv/);
  assert.match(adminPage, /harbornavi-pilot-surveys-/);
  assert.match(privacy, /Pilot family assessment/);
  assert.match(privacy, /calculates category scores, a total score, a score band/);
  assert.match(migration, /create table if not exists pilot_family_surveys/);
  assert.deepEqual(vercel.rewrites.find((rewrite) => rewrite.source === "/api/pilot-survey"), {
    source: "/api/pilot-survey",
    destination: "/api/waitlist?action=pilot-survey"
  });
  assert.deepEqual(vercel.rewrites.find((rewrite) => rewrite.source === "/api/admin/pilot-surveys"), {
    source: "/api/admin/pilot-surveys",
    destination: "/api/admin/health?action=pilot-surveys"
  });
});
