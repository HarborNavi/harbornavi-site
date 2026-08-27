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
  assert.match(homeV6, /setSuccessModalState\("joined"\)/);
  assert.match(homeV6, /No confirmation step is required/);
  assert.doesNotMatch(homeV6, /Check your inbox/);
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
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/home-v8<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/about-harbor<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/harbornavi\.com\/home-v[45]<\/loc>/);
});

test("home-v7, home-v8, and admin666 are isolated from the retained production routes", async () => {
  const homeV6 = await source("src/components/HomeV6Landing.astro");
  const homeV7Page = await source("src/pages/home-v7.astro");
  const homeV7 = await source("src/components/HomeV7Landing.astro");
  const homeV8Page = await source("src/pages/home-v8.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const admin = await source("src/pages/admin.astro");
  const admin666 = await source("src/pages/admin666.astro");

  assert.match(homeV7Page, /HomeV7Landing/);
  assert.match(homeV7, /https:\/\/harbornavi\.com\/home-v7/);
  assert.match(homeV7, /data-route="home-v7"/);
  assert.match(homeV7, /Join the First 5 Pilot Families/);
  assert.match(homeV7, /Home is where the heart is\. And where your memories live\./);
  assert.match(homeV8Page, /HomeV8Landing/);
  assert.match(homeV8, /https:\/\/harbornavi\.com\/home-v8/);
  assert.match(homeV8, /data-route="home-v8"/);
  assert.match(homeV8, /Join the First 5 Pilot Families/);
  assert.match(homeV8, /A mind for the household\. Finally at home\./);
  assert.doesNotMatch(homeV6, /Join the First 5 Pilot Families/);
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

test("privacy copy documents immediate waitlist enrollment and historical-page boundary", async () => {
  const privacy = await source("src/pages/privacy.astro");

  assert.match(privacy, /<code>\/home-v6<\/code> is the current launch page/);
  assert.match(privacy, /<code>\/home-v4<\/code> and <code>\/home-v5<\/code> are no-index historical comparisons/);
  assert.match(privacy, /joins the HarborNavi waitlist immediately/);
  assert.match(privacy, /does not require a confirmation link after submission/);
  assert.match(privacy, /one Resend Topic for HarborNavi Kickstarter pre-launch/);
  assert.match(privacy, /waitlist@harbornavi\.com/);
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
    "email_confirmation_complete",
    "waitlist_cta_click",
    "pilot_apply_start",
    "pilot_apply_submit",
    "pilot_apply_saved",
    "pilot_apply_error"
  ];
  campaignEvents.forEach((eventName) => assert.equal(isAllowedAnalyticsEventName(eventName), true));
  assert.equal(isAllowedAnalyticsEventName("road_home_application_payload"), false);
  assert.equal(isAllowedAnalyticsEventName("unknown_event"), false);
});

test("analytics separates Waitlist and Pilot funnels and deduplicates visitors", async () => {
  const analytics = await source("src/server/analytics.ts");
  const eventsApi = await source("api/events.ts");
  const schema = await source("db/analytics.sql");

  assert.match(analytics, /count\(distinct coalesce\(nullif\(visitor_id/);
  assert.match(analytics, /waitlist_summary/);
  assert.match(analytics, /pilot_summary/);
  assert.match(analytics, /waitlist_funnel/);
  assert.match(analytics, /pilot_funnel/);
  assert.match(analytics, /waitlistSummary\.saved_leads \/ waitlistSummary\.unique_visitors/);
  assert.match(analytics, /pilotSummary\.saved_applications \/ pilotSummary\.unique_visitors/);
  assert.match(eventsApi, /resolveVisitorId\(request\)/);
  assert.match(eventsApi, /set-cookie/);
  assert.match(schema, /add column if not exists visitor_id text/);
});

test("home-v7 and home-v8 expose only a waitlist milestone and qualified privacy claims", async () => {
  const homeV7 = await source("src/components/HomeV7Landing.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const analytics = await source("src/server/analytics.ts");
  const waitlistMetrics = await source("src/server/waitlist-metrics.ts");
  const eventsApi = await source("api/events.ts");
  const waitlistApi = await source("api/waitlist.ts");
  const adminApi = await source("api/admin/analytics.ts");
  const admin = await source("src/pages/admin.astro");
  const admin666 = await source("src/pages/admin666.astro");
  for (const home of [homeV7, homeV8]) {
    assert.equal((home.match(/<aside class="waitlist-countboard/g) || []).length, 2);
    assert.equal((home.match(/<strong>500\+<\/strong>/g) || []).length, 2);
    assert.equal((home.match(/Waitlist milestone/g) || []).length, 2);
    assert.doesNotMatch(home, /Live waitlist/);
    assert.match(home, /people have joined/);
    assert.doesNotMatch(home, /fetch\("\/api\/events"\s*,\s*\{\s*headers/);
    assert.doesNotMatch(home, /waitlistFallback|loadWaitlistActivity|renderWaitlistActivity|waitlist_people/);
    assert.match(home, /No confirmation step is required/);
  }
  assert.match(homeV7, /CircleUserRound/);
  assert.match(homeV7, /privacy-context-ask-icon/);
  assert.match(homeV7, /Inbox/);
  assert.match(homeV7, /Target/);
  assert.match(homeV7, /Fingerprint/);
  assert.match(homeV7, /ShieldCheck/);
  assert.match(homeV7, /LockKeyhole/);
  assert.match(homeV7, /Microscope/);
  assert.match(homeV7, /waitlist_cta_click/);
  assert.doesNotMatch(homeV7, /fetch\("\/api\/events"\s*,\s*\{\s*headers/);
  assert.doesNotMatch(homeV7, /waitlistFallback|loadWaitlistActivity|renderWaitlistActivity|waitlist_people/);
  assert.match(homeV7, /No confirmation step is required/);
  assert.match(analytics, /count\(distinct lower\(email\)\)/);
  assert.match(waitlistMetrics, /WAITLIST_PRIVATE_BASELINE/);
  assert.match(waitlistMetrics, /WAITLIST_PRIVATE_BASELINE_STARTED_AT/);
  assert.match(analytics, /consent_confirmed_at/);
  assert.match(analytics, /getPrivateWaitlistActivity/);
  assert.match(analytics, /private_waitlist: privateWaitlist/);
  assert.match(analytics, /configured: false/);
  assert.match(eventsApi, /export async function GET/);
  assert.match(eventsApi, /status: 405/);
  assert.doesNotMatch(eventsApi, /waitlist_people|getPrivateWaitlistActivity/);
  assert.doesNotMatch(waitlistApi, /waitlist_people|getPrivateWaitlistActivity/);
  assert.match(adminApi, /verifyAdminToken/);
  assert.match(admin, /data-private-waitlist-people/);
  assert.match(admin666, /data-private-waitlist-people/);
  assert.match(admin, /"Unavailable"/);
  assert.match(admin666, /"Unavailable"/);
  assert.match(homeV7, /class="privacy-partnership-highlight"/);
  assert.match(homeV7, /Mode IO\.AI's dynamic privacy and AI safety technology/);
  assert.match(homeV7, /Hong Kong University of Science and Technology/);
  assert.match(homeV7, /95%\+/);
  assert.match(homeV7, /Risk Identification Accuracy/);
  assert.match(homeV7, /False-positive rate below 5%/);
  assert.match(homeV7, /7\+ years/);
  assert.match(homeV7, /privacy compliance, and legal engineering/);
  assert.match(homeV7, /Millions-scale/);
  assert.match(homeV7, /security-scenario data/);
  assert.match(homeV7, /internal benchmarks, team experience/);
  assert.doesNotMatch(homeV7, /world(?:'s|’s) first/i);
});

test("home-v8 leads with household intelligence, then proves local privacy", async () => {
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const heroIndex = homeV8.indexOf('<h1 id="hero-title">A mind for the household. Finally at home.</h1>');
  const intelligenceIndex = homeV8.indexOf('<section id="intelligence"');
  const privacyIndex = homeV8.indexOf('<section id="privacy-tech"');

  assert.ok(heroIndex >= 0);
  assert.ok(intelligenceIndex > heroIndex);
  assert.ok(privacyIndex > intelligenceIndex);
  assert.match(homeV8, /Sci-fi intelligence\. Home-warmed care\. Kept entirely at home\./);
  assert.match(homeV8, /understands context, remembers what matters, and turns plain words into coordinated action/);
  assert.match(homeV8, /One local mind\. Three jobs\./);
  assert.match(homeV8, /Understand context \+ Orchestrate devices \+ Remember what matters/);
  assert.match(homeV8, /Your home, finally fluent\. Your data, finally home\./);
  assert.match(homeV8, /Is HarborNavi just a memory box\?/);
  assert.doesNotMatch(homeV8, /Home is where the heart is/);
  assert.doesNotMatch(homeV8, /Private home memory/);
  assert.doesNotMatch(homeV8, /What this home memory is being built to do/);
});

test("home-v8 explains the match-on-chip and eSE security chain without overstating certification", async () => {
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const styles = await source("src/styles/home-v7.css");

  assert.match(homeV8, /For sensitive changes/);
  assert.match(homeV8, /One touch confirms it's you\. Hardware protects what comes next\./);
  assert.match(homeV8, /Match-on-Chip/);
  assert.match(homeV8, /Confirm it's you/);
  assert.match(homeV8, /require a fingerprint scan on the box/);
  assert.match(homeV8, /main system does not perform the biometric comparison/);
  assert.match(homeV8, /02 &middot; Security solution/);
  assert.match(homeV8, /Keep identity and keys protected/);
  assert.match(homeV8, /Approve only this change/);
  assert.match(homeV8, /One successful match never unlocks everything/);
  assert.match(homeV8, /eSE chip and its COS have achieved SOGIS CC EAL5\+ certification under Common Criteria/);
  assert.match(homeV8, /widely recognized international framework for evaluating security products/);
  assert.match(homeV8, /An eSE chip separates device identity, trusted credentials, and encryption keys from the main system/);
  assert.match(homeV8, /goodix\.com\/en\/product\/security_products\/ese/);
  assert.match(homeV8, /Certification applies to the selected security chip, not HarborNavi as a complete product/);
  assert.match(homeV8, /Final hardware remains subject to validation/);
  assert.match(homeV8, /key_int/);
  assert.match(homeV8, /WAKEUP/);
  assert.match(homeV8, /secure software and access controls are still required/i);
  assert.doesNotMatch(homeV8, /planned (?:eSE|secure element|certified security chip)/i);
  assert.doesNotMatch(homeV8, /never leaks|cannot leak|guarantees? (?:privacy|security)|HarborNavi (?:is|has been) (?:SOGIS )?CC EAL/i);
  assert.match(styles, /\.fingerprint-detail/);
  assert.match(styles, /\.match-on-chip-step/);
  assert.match(styles, /\.ese-certification-level/);
});

test("waitlist API activates submissions without confirmation email delivery", async () => {
  const api = await source("api/waitlist.ts");
  const waitlist = await source("src/server/waitlist.ts");
  const cron = await source("api/cron/retry-waitlist.ts");

  assert.match(api, /activateWaitlistConsent/);
  assert.match(api, /subscription_status: "confirmed"/);
  assert.match(api, /confirmation_email_required: false/);
  assert.doesNotMatch(api, /waitlist_people/);
  assert.doesNotMatch(api, /deliverWaitlistConfirmation/);
  assert.match(waitlist, /confirmation_email_status', 'not_required'/);
  assert.doesNotMatch(cron, /deliverWaitlistConfirmation/);
});

test("home-v7 and home-v8 replace the wide comparison table with mobile category tabs", async () => {
  const homeV7 = await source("src/components/HomeV7Landing.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const styles = await source("src/styles/home-v7.css");
  for (const home of [homeV7, homeV8]) {
    assert.match(home, /data-mobile-compare/);
    assert.equal((home.match(/data-mobile-compare-tab=/g) || []).length, 4);
    assert.match(home, /role="tabpanel"/);
    assert.match(home, /selectMobileComparison/);
  }
  assert.match(styles, /\.mobile-compare \{ display: none; \}/);
  assert.match(styles, /\.compare-wrap \{ display: none; \}/);
  assert.match(styles, /\.mobile-compare \{ display: block; \}/);
});

test("all interactive forms force browser validation prompts to English", async () => {
  const validation = await source("src/components/EnglishFormValidation.astro");
  assert.match(validation, /document\.addEventListener\("invalid"/);
  assert.match(validation, /Please fill out this field\./);
  assert.match(validation, /Please enter your email address\./);
  assert.match(validation, /Please enter a valid email address\./);
  assert.match(validation, /Please select an option\./);
  assert.match(validation, /Please choose a file\./);

  const formPages = [
    "src/components/LandingPage.astro",
    "src/components/HomeV2Landing.astro",
    "src/components/HomeV3Landing.astro",
    "src/components/HomeV6Landing.astro",
    "src/components/HomeV7Landing.astro",
    "src/components/HomeV8Landing.astro",
    "src/pages/pilot-families.astro",
    "src/pages/admin.astro",
    "src/pages/admin666.astro"
  ];

  for (const path of formPages) {
    const page = await source(path);
    assert.match(page, /EnglishFormValidation/);
    assert.match(page, /<EnglishFormValidation \/>/);
  }

  assert.match(await source("src/pages/pilot-families.astro"), /Please enter a valid ZIP code, such as 94107\./);
});
