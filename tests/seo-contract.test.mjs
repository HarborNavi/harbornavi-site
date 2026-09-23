import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("the shared SEO head emits absolute canonical, Open Graph, and Twitter metadata", async () => {
  const seoHead = await source("src/components/SeoHead.astro");

  assert.match(seoHead, /const siteUrl = "https:\/\/harbornavi\.com"/);
  assert.match(seoHead, /const pageUrl = `\$\{siteUrl\}\$\{normalizedPath\}`/);
  assert.match(seoHead, /const imageUrl = \/\^https\?:/);
  assert.match(seoHead, /<link rel="canonical" href=\{pageUrl\} \/>/);
  assert.match(seoHead, /<meta property="og:url" content=\{pageUrl\} \/>/);
  assert.match(seoHead, /<meta property="og:image" content=\{imageUrl\} \/>/);
  assert.match(seoHead, /<meta name="twitter:image" content=\{imageUrl\} \/>/);
});

test("all public indexable pages use the shared SEO head", async () => {
  const pages = [
    "src/components/LandingPage.astro",
    "src/components/FifteenHomesLanding.astro",
    "src/components/HomeV6Landing.astro",
    "src/components/HomeV7Landing.astro",
    "src/components/HomeV8Landing.astro",
    "src/pages/about-harbor.astro",
    "src/pages/facts.astro",
    "src/pages/privacy.astro",
    "src/pages/pilot-families.astro"
  ];

  for (const path of pages) {
    const page = await source(path);
    assert.match(page, /SeoHead/, path);
  }
});

test("landing pages pass relative hero assets through the shared SEO head", async () => {
  const page = await source("src/components/LandingPage.astro");
  assert.match(page, /image=\{heroAsset\.url\}/);
  assert.match(page, /imageAlt=\{heroAsset\.alt\}/);
});

test("public page titles follow the approved SEO direction", async () => {
  const [landingPages, home, about, pilot] = await Promise.all([
    source("src/data/landingPages.ts"),
    source("src/components/HomeV8Landing.astro"),
    source("src/pages/about-harbor.astro"),
    source("src/pages/pilot-families.astro")
  ]);

  assert.match(home, /const homeTitle = "HarborNavi \| Private Local-First AI for the Smart Home"/);
  assert.match(landingPages, /metaTitle: "AI Package Detection for Home Cameras"/);
  assert.match(landingPages, /metaTitle: "AI Pet Camera Highlights, Kept Local"/);
  assert.match(about, /const aboutTitle = "About Harbor Innovations \| Local AI for the Home"/);
  assert.match(pilot, /HarborNavi Pilot Program \| Waitlist and Field Test/);
});
