import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { isAllowedAnalyticsEventName } from "../src/server/analytics-events.ts";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

async function filesUnder(path) {
  const entries = await readdir(new URL(path, root), { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const child = `${path}${entry.name}`;
    return entry.isDirectory() ? filesUnder(`${child}/`) : [child];
  }));
  return files.flat();
}

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

test("campaign email links target the current home-v6 join anchor", async () => {
  const campaignPage = await source("src/components/FifteenHomesLanding.astro");
  const thanksPage = await source("src/pages/15-homes/thanks.astro");
  const homeV6 = await source("src/components/HomeV6Landing.astro");
  const combined = `${campaignPage}\n${thanksPage}`;
  assert.match(homeV6, /id="join"/);
  assert.doesNotMatch(combined, /\/home-v[45]#(?:join|waitlist)/);
  assert.equal((combined.match(/\/home-v6#join/g) || []).length, 3);
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

test("home-v6 keeps exactly two email-only waitlist forms with honeypots", async () => {
  const homeV6 = await source("src/components/HomeV6Landing.astro");
  const forms = [...homeV6.matchAll(/<form\b[^>]*data-early-form[\s\S]*?<\/form>/g)].map((match) => match[0]);

  assert.equal(forms.length, 2);
  for (const form of forms) {
    assert.match(form, /type="email" name="email"/);
    assert.match(form, /name="company" type="text"/);
    assert.doesNotMatch(form, /name="(?:application|profile|primary_interest|camera|beta|price|purchase)[^"]*"/i);
  }
  assert.match(homeV6, /document\.querySelectorAll\("\[data-early-form\]"\)/);
  assert.match(homeV6, /fetch\("\/api\/waitlist"/);
  assert.match(homeV6, /subscription_status === "confirmed"/);
  assert.match(homeV6, /email_confirmation_complete/);
});

test("home-v6 uses optimized runtime images without changing its social preview", async () => {
  const homeV6 = await source("src/components/HomeV6Landing.astro");
  const runtimeImages = [
    "home-v6-memory-hero-id.webp",
    "home-v6-family-moment-id.webp",
    "home-v6-homecoming-briefing-id.webp",
    "home-v4-package-response.webp",
    "home-v6-movie-night-id.webp",
    "home-v6-trust-boundary-id.webp",
    "home-v6-hardware-id.webp"
  ];

  assert.match(homeV6, /const heroImage = "\/assets\/home-v6-memory-hero-id\.webp"/);
  assert.match(homeV6, /const heroSocialImage = "\/assets\/home-v6-memory-hero-id\.png"/);
  assert.match(homeV6, /<img src=\{heroImage\}[^>]*fetchpriority="high"/);
  for (const filename of runtimeImages) {
    assert.match(homeV6, new RegExp(`/assets/${filename.replace(".", "\\.")}`));
    const bytes = await readFile(new URL(`public/assets/${filename}`, root));
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  }
});

test("home-v4 and home-v5 remain no-index historical comparisons", async () => {
  for (const version of ["4", "5"]) {
    const archived = await source(`src/components/HomeV${version}Landing.astro`);
    const forms = [...archived.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((match) => match[0]);

    assert.match(archived, /<meta name="robots" content="noindex,follow" \/>/);
    assert.equal(forms.length, 2);
    for (const form of forms) {
      assert.match(form, /action="\/home-v6#join"/);
      assert.match(form, /method="get"/);
      assert.match(form, /type="email"[^>]*disabled/);
      assert.doesNotMatch(form, /data-early-form/);
    }
  }
});

test("public roots redirect to home-v6 and archived pages stay out of the sitemap", async () => {
  const vercel = JSON.parse(await source("vercel.json"));
  const sitemap = await source("public/sitemap.xml");
  const redirects = new Map(vercel.redirects.map((redirect) => [redirect.source, redirect]));

  for (const route of ["/", "/home"]) {
    assert.deepEqual(redirects.get(route), {
      source: route,
      destination: "/home-v6",
      permanent: true
    });
  }
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/home-v6<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/home-v7<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/harbornavi\.com\/home-v[45]<\/loc>/);
});

test("home-v7 and admin666 are isolated from the retained production routes", async () => {
  const homeV6 = await source("src/components/HomeV6Landing.astro");
  const homeV7Page = await source("src/pages/home-v7.astro");
  const homeV7 = await source("src/components/HomeV7Landing.astro");
  const admin = await source("src/pages/admin.astro");
  const admin666 = await source("src/pages/admin666.astro");

  assert.match(homeV7Page, /HomeV7Landing/);
  assert.match(homeV7, /https:\/\/harbornavi\.com\/home-v7/);
  assert.match(homeV7, /data-route="home-v7"/);
  assert.match(homeV7, /Be One of the First 5 Pilot Families/);
  assert.doesNotMatch(homeV6, /Be One of the First 5 Pilot Families/);
  assert.match(admin666, /data-tab-button="pilot-applications"/);
  assert.match(admin666, /data-tab-button="media"/);
  assert.doesNotMatch(admin, /data-tab-button="pilot-applications"/);
  assert.doesNotMatch(admin, /data-tab-button="media"/);
});

test("Vercel routing stays within the Hobby function limit", async () => {
  const vercel = JSON.parse(await source("vercel.json"));
  const apiFunctions = (await filesUnder("api/")).filter((path) => /\.[cm]?[jt]s$/.test(path));

  assert.ok(apiFunctions.length <= 12, `expected at most 12 Vercel functions, found ${apiFunctions.length}`);
  assert.deepEqual(
    vercel.rewrites.find((rewrite) => rewrite.source === "/api/waitlist/profile"),
    {
      source: "/api/waitlist/profile",
      destination: "/api/waitlist?action=profile"
    }
  );
  assert.equal(vercel.crons.find((cron) => cron.path === "/api/cron/retry-waitlist")?.schedule, "0 2 * * *");
  assert.match(await source(".github/workflows/retry-waitlist.yml"), /cron: "17 \* \* \* \*"/);
});

test("privacy copy documents the V6 double-opt-in and historical-page boundary", async () => {
  const privacy = await source("src/pages/privacy.astro");

  assert.match(privacy, /<code>\/home-v6<\/code> is the current launch page/);
  assert.match(privacy, /<code>\/home-v4<\/code> and <code>\/home-v5<\/code> are no-index historical comparisons/);
  assert.match(privacy, /starts as pending and is not added\s+to a marketing audience at submission time/);
  assert.match(privacy, /signed confirmation link\s+expires after seven days/);
  assert.match(privacy, /one Resend Topic for\s+HarborNavi Kickstarter pre-launch updates/);
  assert.match(privacy, /An unconfirmed V6 lead is deleted from Neon after 30 days/);
  assert.match(privacy, /voluntary product survey hosted by SurveyMonkey/);
  assert.match(privacy, /Survey answers are separate from launch-list\s+consent/);
});

test("campaign analytics events are allowlisted and unknown events stay ignored", () => {
  const campaignEvents = [
    "survey_click",
    "road_home_apply_click",
    "road_home_form_start",
    "road_home_form_complete",
    "kickstarter_prelaunch_click",
    "youtube_live_click",
    "youtube_replay_click",
    "email_confirmation_complete"
  ];
  campaignEvents.forEach((eventName) => assert.equal(isAllowedAnalyticsEventName(eventName), true));
  assert.equal(isAllowedAnalyticsEventName("road_home_application_payload"), false);
  assert.equal(isAllowedAnalyticsEventName("unknown_event"), false);
});
