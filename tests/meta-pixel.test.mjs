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

test("Meta Pixel waits for marketing consent and sends PageView only", async () => {
  const pixel = await source("src/components/MetaPixel.astro");

  assert.match(pixel, /import\.meta\.env\.PUBLIC_META_PIXEL_ID/);
  assert.match(pixel, /1257319255516210/);
  assert.match(pixel, /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/);
  assert.match(pixel, /window\.fbq\("init", pixelId\)/);
  assert.match(pixel, /window\.fbq\("track", "PageView"\)/);
  assert.match(pixel, /harbornavi_marketing_consent/);
  assert.match(pixel, /if \(!marketingAllowed \|\| initialized\) return/);
  assert.match(pixel, /previousMarketingConsentHandler\?\.\(granted\)/);
  assert.doesNotMatch(pixel, /<noscript|facebook\.com\/tr\?/);
  assert.doesNotMatch(pixel, /email|zip|device_summary|application_answers/i);
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
  assert.match(privacy, /not passed to\s+Reddit or Meta/);
  assert.match(readme, /no GTM, Reddit, or Meta request occurs before `granted` consent/);
  assert.match(readme, /noscript/);
});
