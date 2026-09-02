import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

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

test("Meta base pixel waits for marketing consent and sends PageView", async () => {
  const pixel = await source("src/components/MetaPixel.astro");

  assert.match(pixel, /import\.meta\.env\.PUBLIC_META_PIXEL_ID/);
  assert.match(pixel, /1257319255516210/);
  assert.match(pixel, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(pixel, /window\.fbq\("init", pixelId\)/);
  assert.match(pixel, /window\.fbq\("track", eventName, parameters, \{ eventID: eventId \}\)/);
  assert.match(pixel, /queuePixelEvent\("PageView"\)/);
  assert.match(pixel, /meta_test/);
  assert.match(pixel, /library-blocked/);
  assert.match(pixel, /window\.harborMetaTrack = \(eventName\) =>/);
  assert.match(pixel, /marketingAllowed = hasMarketingConsent\(\)/);
  assert.match(pixel, /if \(!marketingAllowed && !testModeAllowed\) return/);
  assert.match(pixel, /early_bird_saved:\s*\{\s*name: "Lead"/);
  assert.match(pixel, /harbornavi_marketing_consent/);
  assert.match(pixel, /if \(\(!marketingAllowed && !testModeAllowed\) \|\| initialized\) \{[\s\S]*?return;/);
  assert.match(pixel, /previousMarketingConsentHandler\?\.\(granted\)/);
  assert.doesNotMatch(pixel, /<noscript|facebook\.com\/tr\?/);
  assert.doesNotMatch(pixel, /data\.get|formLocation|route|utm_|device_summary|application_answers|\bzip\b/i);
});

test("Meta Lead fires only after a saved waitlist response and contains no form data", async () => {
  const pixel = await source("src/components/MetaPixel.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const responseGuardIndex = homeV8.indexOf("if (!response.ok)");
  const savedEventIndex = homeV8.indexOf('window.harborTrack("early_bird_saved"');
  const errorEventIndex = homeV8.indexOf('window.harborTrack("early_bird_error"');

  assert.ok(responseGuardIndex >= 0);
  assert.ok(responseGuardIndex < savedEventIndex);
  assert.ok(savedEventIndex < errorEventIndex);
  assert.match(homeV8, /window\.harborMetaTrack\?\.\(eventName\)/);
  assert.doesNotMatch(homeV8, /window\.fbq\("track", "Lead"/);
  assert.match(pixel, /initializePixel\(\);\s*queuePixelEvent\(conversion\.name, conversion\.parameters\)/);

  const metaLeadParameters = pixel.match(/parameters: \{([\s\S]*?)\}\s*\}/);
  assert.ok(metaLeadParameters);
  assert.match(metaLeadParameters[1], /content_name: "HarborNavi Waitlist"/);
  assert.match(metaLeadParameters[1], /content_category: "Email Signup"/);
  assert.doesNotMatch(metaLeadParameters[1], /formLocation|route|data\.get|utm_|application|device|\bzip\b/i);
});

test("Meta queues PageView and Lead after consent without leaking form values", async () => {
  const pixel = await source("src/components/MetaPixel.astro");
  const inlineScript = pixel.match(/<script is:inline define:vars=\{\{ consentCookieName, pixelId \}\}>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  const appendedScripts = [];
  const context = {
    document: {
      cookie: "",
      documentElement: { dataset: {} },
      createElement: () => ({ addEventListener: () => {} }),
      getElementsByTagName: () => [{
        parentNode: { insertBefore: (script) => appendedScripts.push(script.src) }
      }]
    },
    URLSearchParams,
    window: { location: { search: "" } }
  };

  vm.runInNewContext(
    `const consentCookieName = "harbornavi_marketing_consent"; const pixelId = "1257319255516210"; ${inlineScript}`,
    context
  );

  assert.equal(context.window.fbq, undefined);
  context.document.cookie = "harbornavi_marketing_consent=granted";
  context.window.harborSetMarketingConsent(true);
  context.window.harborMetaTrack("early_bird_error");
  context.window.harborMetaTrack("early_bird_saved");

  assert.deepEqual(JSON.parse(JSON.stringify(context.window.fbq.queue)), [
    ["init", "1257319255516210"],
    ["track", "PageView", {}, {
      eventID: context.window.fbq.queue[1][3].eventID
    }],
    ["track", "Lead", {
      content_name: "HarborNavi Waitlist",
      content_category: "Email Signup"
    }, {
      eventID: context.window.fbq.queue[2][3].eventID
    }]
  ]);
  assert.match(context.window.fbq.queue[1][3].eventID, /^harbornavi_pageview_\d+_/);
  assert.match(context.window.fbq.queue[2][3].eventID, /^harbornavi_lead_\d+_/);
  assert.deepEqual(appendedScripts, ["https://connect.facebook.net/en_US/fbevents.js"]);
});

test("Meta Test Events URL loads only the Meta Pixel after a prior denial", async () => {
  const pixel = await source("src/components/MetaPixel.astro");
  const inlineScript = pixel.match(/<script is:inline define:vars=\{\{ consentCookieName, pixelId \}\}>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);

  const appendedScripts = [];
  const context = {
    document: {
      cookie: "harbornavi_marketing_consent=denied",
      documentElement: { dataset: {} },
      createElement: () => ({ addEventListener: () => {} }),
      getElementsByTagName: () => [{
        parentNode: { insertBefore: (script) => appendedScripts.push(script.src) }
      }]
    },
    URLSearchParams,
    window: { location: { search: "?test_event_code=TEST23388" } }
  };

  vm.runInNewContext(
    `const consentCookieName = "harbornavi_marketing_consent"; const pixelId = "1257319255516210"; ${inlineScript}`,
    context
  );

  assert.deepEqual(JSON.parse(JSON.stringify(context.window.fbq.queue)), [
    ["init", "1257319255516210"],
    ["track", "PageView", {}, {
      eventID: context.window.fbq.queue[1][3].eventID
    }]
  ]);
  assert.equal(context.document.documentElement.dataset.metaPixelConsent, "test-mode");
  assert.match(context.document.documentElement.dataset.metaPixelLastEventId, /^harbornavi_pageview_\d+_/);
  assert.deepEqual(appendedScripts, ["https://connect.facebook.net/en_US/fbevents.js"]);
});

test("all public documents install Meta Pixel while admin documents do not", async () => {
  for (const path of publicDocuments) {
    const page = await source(path);
    assert.match(page, /import MetaPixel from /, `${path} must import MetaPixel`);
    assert.match(page, /<MetaPixel \/>/, `${path} must render MetaPixel`);
  }

  for (const path of ["src/pages/admin.astro", "src/pages/admin666.astro"]) {
    assert.doesNotMatch(await source(path), /MetaPixel/);
  }
});

test("Meta Pixel configuration, consent copy, and disclosure stay documented", async () => {
  const [environment, productionEnvironment, consent, privacy, readme] = await Promise.all([
    source(".env.example"),
    source(".env.production"),
    source("src/components/MarketingConsent.astro"),
    source("src/pages/privacy.astro"),
    source("README.md")
  ]);

  assert.match(environment, /PUBLIC_META_PIXEL_ID=""/);
  assert.match(productionEnvironment, /PUBLIC_META_PIXEL_ID="1257319255516210"/);
  assert.match(consent, /Reddit and Meta Pixels/);
  assert.match(consent, /clearKnownMetaCookies/);
  assert.match(consent, /"_fbp", "_fbc"/);
  assert.match(privacy, /Reddit and Meta advertising measurement/);
  assert.match(privacy, /sends a PageView event/);
  assert.match(privacy, /A sign-up event is sent to Reddit and Meta only after a waitlist submission is saved/);
  assert.match(privacy, /not passed to\s+Reddit or Meta/);
  assert.match(readme, /a `Lead` event only after `\/api\/waitlist` successfully saves an address/);
  assert.match(readme, /`HarborNavi Waitlist` and `Email Signup`/);
  assert.match(readme, /no GTM, Reddit, or Meta request occurs before `granted` consent/);
  assert.match(readme, /https:\/\/harbornavi\.com\/\?meta_test=1/);
  assert.match(readme, /`track`/);
  assert.match(readme, /`test_event_code` is used by Events Manager to identify the browser test session/);
  assert.match(readme, /noscript/);
});

test("Meta test mode recognizes Meta Test Events URLs without enabling Reddit", async () => {
  const consent = await source("src/components/MarketingConsent.astro");
  const pixel = await source("src/components/MetaPixel.astro");
  assert.match(consent, /searchParams\.get\("test_event_code"\)/);
  assert.match(consent, /metaTestMode/);
  assert.match(pixel, /testEventCode/);
  assert.match(pixel, /testModeAllowed = metaTestMode/);
  assert.doesNotMatch(pixel, /test_event_code:\s*testEventCode/);
});
