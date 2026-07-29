import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { isAllowedAnalyticsEventName } from "../src/server/analytics-events.ts";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("campaign dates and public route stay on the approved contract", async () => {
  const config = await source("src/data/campaign.ts");
  assert.match(config, /kickstarterPrelaunchDate: "2026-09-15"/);
  assert.match(config, /roadEventStart: "2026-11-12"/);
  assert.match(config, /roadEventEnd: "2026-12-05"/);
  assert.match(config, /finalReportDate: "2026-12-12"/);
  assert.match(config, /kickstarterLaunchDate: "2027-01-12"/);
  assert.match(config, /routeLabel: "New Haven → Los Angeles → Palo Alto"/);
  assert.match(config, /recruitmentCorridor: \[\s*"New Haven"/);
});

test("campaign pages declare their canonical URLs", async () => {
  const campaignPage = await source("src/components/FifteenHomesLanding.astro");
  const thanksPage = await source("src/pages/15-homes/thanks.astro");
  assert.match(campaignPage, /rel="canonical" href="https:\/\/harbornavi\.com\/15-homes"/);
  assert.match(thanksPage, /rel="canonical" href="https:\/\/harbornavi\.com\/15-homes\/thanks"/);
});

test("campaign email links target the existing home-v5 join anchor", async () => {
  const campaignPage = await source("src/components/FifteenHomesLanding.astro");
  const thanksPage = await source("src/pages/15-homes/thanks.astro");
  const homeV5 = await source("src/components/HomeV5Landing.astro");
  assert.match(homeV5, /id="join"/);
  assert.doesNotMatch(`${campaignPage}\n${thanksPage}`, /\/home-v5#waitlist/);
  assert.equal((`${campaignPage}\n${thanksPage}`.match(/\/home-v5#join/g) || []).length, 3);
});

test("application availability distinguishes missing URL from pending privacy review", async () => {
  const config = await source("src/data/campaign.ts");
  const campaignPage = await source("src/components/FifteenHomesLanding.astro");
  assert.match(config, /roadHomesFormUrl: roadHomesPrivacyReady \? roadHomesFormUrl : null/);
  assert.match(config, /youtubeChannelUrl:/);
  assert.match(config, /youtubePlaylistUrl:/);
  assert.match(campaignPage, /campaign\.roadHomesFormUrlConfigured && !campaign\.roadHomesPrivacyReady/);
  assert.match(campaignPage, /privacy review pending|retention window, deletion contact/);
  assert.match(campaignPage, /No form URL has been published yet/);
});

test("home-v5 keeps exactly two email-only waitlist forms with honeypots", async () => {
  const homeV5 = await source("src/components/HomeV5Landing.astro");
  const forms = [...homeV5.matchAll(/<form\b[^>]*data-early-form[\s\S]*?<\/form>/g)].map((match) => match[0]);

  assert.equal(forms.length, 2);
  for (const form of forms) {
    assert.match(form, /type="email" name="email"/);
    assert.match(form, /name="company" type="text"/);
    assert.doesNotMatch(form, /name="(?:application|profile|primary_interest|camera|beta|price|purchase)[^"]*"/i);
  }
  assert.match(homeV5, /document\.querySelectorAll\("\[data-early-form\]"\)/);
  assert.match(homeV5, /fetch\("\/api\/waitlist"/);
});

test("campaign analytics events are allowlisted and unknown events stay ignored", () => {
  const campaignEvents = [
    "survey_click",
    "road_home_apply_click",
    "road_home_form_start",
    "road_home_form_complete",
    "kickstarter_prelaunch_click",
    "youtube_live_click",
    "youtube_replay_click"
  ];
  campaignEvents.forEach((eventName) => assert.equal(isAllowedAnalyticsEventName(eventName), true));
  assert.equal(isAllowedAnalyticsEventName("road_home_application_payload"), false);
  assert.equal(isAllowedAnalyticsEventName("unknown_event"), false);
});
