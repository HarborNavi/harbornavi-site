import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const directPixelDocuments = [
  "src/components/LandingPage.astro",
  "src/components/HomeV2Landing.astro",
  "src/components/HomeV3Landing.astro",
  "src/components/HomeV4Landing.astro",
  "src/components/HomeV5Landing.astro",
  "src/components/HomeV6Landing.astro",
  "src/components/HomeV7Landing.astro",
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

test("direct Reddit Pixel requires marketing consent and sends only approved events", async () => {
  const pixel = await source("src/components/RedditPixel.astro");

  assert.match(pixel, /import\.meta\.env\.PUBLIC_REDDIT_PIXEL_ID/);
  assert.match(pixel, /\{enabled && \(/);
  assert.match(pixel, /https:\/\/www\.redditstatic\.com\/ads\/pixel\.js/);
  assert.match(pixel, /window\.rdt\("track", "PageVisit"\)/);
  assert.match(pixel, /early_bird_saved: "SignUp"/);
  assert.match(pixel, /waitlist_saved: "SignUp"/);
  assert.match(pixel, /pilot_apply_saved: "Lead"/);
  assert.match(pixel, /harbornavi_marketing_consent/);
  assert.match(pixel, /marketingAllowed/);
  assert.match(pixel, /window\.harborSetMarketingConsent/);
  assert.doesNotMatch(pixel, /email|zip|device_summary|application_answers/i);
});

test("Home V8 routes Reddit events through GTM without exposing form data", async () => {
  const [consent, gtm, homeV8] = await Promise.all([
    source("src/components/MarketingConsent.astro"),
    source("src/components/GoogleTagManager.astro"),
    source("src/components/HomeV8Landing.astro")
  ]);

  assert.match(gtm, /import\.meta\.env\.PUBLIC_GOOGLE_TAG_MANAGER_ID/);
  assert.match(gtm, /\^GTM-\[A-Z0-9\]\+\$/);
  assert.match(gtm, /https:\/\/www\.googletagmanager\.com\/gtm\.js/);
  assert.doesNotMatch(gtm, /ns\.html|<noscript>/);
  assert.match(gtm, /harbornavi_marketing_consent/);
  assert.match(gtm, /if \(!marketingAllowed \|\| containerLoaded\) return/);
  assert.match(gtm, /window\.harborSetMarketingConsent/);
  assert.match(gtm, /page_view: "reddit_page_visit"/);
  assert.match(gtm, /early_bird_saved: "reddit_sign_up"/);
  assert.doesNotMatch(gtm, /pilot_apply_saved|reddit_lead/);
  assert.doesNotMatch(gtm, /email|zip|device_summary|application_answers/i);

  assert.match(consent, /data-marketing-consent-decline/);
  assert.match(consent, /data-marketing-consent-allow/);
  assert.match(consent, /role="switch"/);
  assert.match(consent, /Max-Age=\$\{preferenceLifetimeSeconds\}/);
  assert.match(consent, /60 \* 60 \* 24 \* 180/);
  assert.match(consent, /clearKnownRedditCookies/);
  assert.match(consent, /window\.harborSetMarketingConsent\?\.\(granted\)/);

  assert.match(homeV8, /import GoogleTagManager from /);
  assert.match(homeV8, /import MarketingConsent from /);
  assert.match(homeV8, /<GoogleTagManager \/>/);
  assert.match(homeV8, /<MarketingConsent \/>/);
  assert.match(homeV8, /data-cookie-settings-open/);
  assert.doesNotMatch(homeV8, /RedditPixel/);
});

test("other public documents install the direct Reddit Pixel while admin documents do not", async () => {
  for (const path of directPixelDocuments) {
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
  const [environment, productionEnvironment, privacy, readme] = await Promise.all([
    source(".env.example"),
    source(".env.production"),
    source("src/pages/privacy.astro"),
    source("README.md")
  ]);

  assert.match(environment, /PUBLIC_GOOGLE_TAG_MANAGER_ID=""/);
  assert.match(productionEnvironment, /PUBLIC_GOOGLE_TAG_MANAGER_ID="GTM-MXJJ9BXG"/);
  assert.match(environment, /PUBLIC_REDDIT_PIXEL_ID=""/);
  assert.match(privacy, /Reddit advertising measurement/);
  assert.match(privacy, /Marketing tools are off unless you select Allow marketing cookies/);
  assert.match(privacy, /harbornavi_marketing_consent/);
  assert.match(privacy, /up to 180/);
  assert.match(privacy, /Form fields such as email address, ZIP Code, device summary,/);
  assert.match(privacy, /not loaded\s+on HarborNavi admin pages/);
  assert.match(readme, /reddit_page_visit/);
  assert.match(readme, /reddit_sign_up/);
  assert.match(readme, /GTM-MXJJ9BXG/);
  assert.match(readme, /no GTM request or Reddit event occurs before `granted` consent/);
});
