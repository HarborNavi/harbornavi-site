import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const publicDocuments = [
  "src/components/LandingPage.astro",
  "src/components/HomeV2Landing.astro",
  "src/components/HomeV3Landing.astro",
  "src/components/HomeV4Landing.astro",
  "src/components/HomeV5Landing.astro",
  "src/components/HomeV6Landing.astro",
  "src/components/HomeV7Landing.astro",
  "src/components/HomeV8Landing.astro",
  "src/components/FifteenHomesLanding.astro",
  "src/pages/pilot-families.astro",
  "src/pages/about-harbor.astro",
  "src/pages/privacy.astro",
  "src/pages/15-homes/thanks.astro"
];

const analyticsSources = [
  "src/components/CampaignAnalytics.astro",
  "src/components/LandingPage.astro",
  "src/components/HomeV2Landing.astro",
  "src/components/HomeV3Landing.astro",
  "src/components/HomeV4Landing.astro",
  "src/components/HomeV5Landing.astro",
  "src/components/HomeV6Landing.astro",
  "src/components/HomeV7Landing.astro",
  "src/components/HomeV8Landing.astro",
  "src/pages/pilot-families.astro"
];

test("Reddit Pixel is disabled without a valid public Pixel ID and sends only approved events", async () => {
  const pixel = await source("src/components/RedditPixel.astro");

  assert.match(pixel, /import\.meta\.env\.PUBLIC_REDDIT_PIXEL_ID/);
  assert.match(pixel, /\{enabled && \(/);
  assert.match(pixel, /https:\/\/www\.redditstatic\.com\/ads\/pixel\.js/);
  assert.match(pixel, /window\.rdt\("track", "PageVisit"\)/);
  assert.match(pixel, /early_bird_saved: "SignUp"/);
  assert.match(pixel, /waitlist_saved: "SignUp"/);
  assert.match(pixel, /pilot_apply_saved: "Lead"/);
  assert.doesNotMatch(pixel, /email|zip|device_summary|application_answers/i);
});

test("every public document installs Reddit Pixel while admin documents do not", async () => {
  for (const path of publicDocuments) {
    const page = await source(path);
    assert.match(page, /import RedditPixel from /, `${path} must import RedditPixel`);
    assert.match(page, /<RedditPixel \/>/, `${path} must render RedditPixel`);
  }

  for (const path of ["src/pages/admin.astro", "src/pages/admin666.astro"]) {
    assert.doesNotMatch(await source(path), /RedditPixel/);
  }
});

test("all first-party analytics dispatchers forward successful conversions to Reddit", async () => {
  for (const path of analyticsSources) {
    const analytics = await source(path);
    const definitions = analytics.match(/window\.harborTrack = function/g) || [];
    const bridges = analytics.match(/window\.harborRedditTrack\?\.\(eventName\)/g) || [];
    assert.equal(bridges.length, definitions.length, `${path} must bridge every harborTrack dispatcher`);
  }
});

test("Reddit Pixel configuration and disclosure stay documented", async () => {
  const [environment, privacy] = await Promise.all([
    source(".env.example"),
    source("src/pages/privacy.astro")
  ]);

  assert.match(environment, /PUBLIC_REDDIT_PIXEL_ID=""/);
  assert.match(privacy, /Reddit advertising measurement/);
  assert.match(privacy, /Form fields such as email address, ZIP Code, device summary,/);
  assert.match(privacy, /The Pixel is not loaded on HarborNavi admin pages/);
});
