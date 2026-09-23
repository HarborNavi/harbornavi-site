import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildSeoEntityGraph, harborAbsoluteUrl } from "../src/data/seoEntities.ts";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("GEO URLs are absolute and stable", () => {
  assert.equal(harborAbsoluteUrl("/"), "https://harbornavi.com");
  assert.equal(harborAbsoluteUrl("/package/"), "https://harbornavi.com/package");
  assert.equal(harborAbsoluteUrl("https://cdn.example.com/image.png"), "https://cdn.example.com/image.png");
});

test("GEO graph connects the page to stable Organization, Brand, Website, Product, and FAQ entities", () => {
  const graph = buildSeoEntityGraph({
    title: "AI Package Detection for Home Cameras | HarborNavi",
    description: "Detect package arrivals with local-first AI.",
    path: "/package",
    image: "/assets/package.png",
    mainEntity: "product",
    faqItems: [{ question: "Where is footage processed?", answer: "On the HarborNavi device in your home." }]
  });

  assert.equal(graph["@context"], "https://schema.org");
  const entities = graph["@graph"];
  const organization = entities.find((entity) => entity["@type"] === "Organization");
  const brand = entities.find((entity) => entity["@type"] === "Brand");
  const website = entities.find((entity) => entity["@type"] === "WebSite");
  const product = entities.find((entity) => entity["@type"] === "Product");
  const webpage = entities.find((entity) => entity["@type"] === "WebPage");
  const faq = entities.find((entity) => entity["@type"] === "FAQPage");

  assert.equal(organization["@id"], "https://harbornavi.com/#organization");
  assert.equal(brand["@id"], "https://harbornavi.com/#brand");
  assert.equal(website["@id"], "https://harbornavi.com/#website");
  assert.equal(product["@id"], "https://harbornavi.com/#product");
  assert.deepEqual(webpage.mainEntity, { "@id": product["@id"] });
  assert.deepEqual(webpage.hasPart, { "@id": "https://harbornavi.com/package#faq" });
  assert.equal(faq.mainEntity[0].name, "Where is footage processed?");
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "On the HarborNavi device in your home.");
});

test("AI search crawlers are explicitly allowed without changing the GPTBot training policy", async () => {
  const robots = await source("public/robots.txt");

  assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//);
  assert.match(robots, /User-agent: Googlebot\s+Allow: \//);
  assert.match(robots, /User-agent: \*\s+Allow: \//);
  assert.doesNotMatch(robots, /User-agent: GPTBot/);
});

test("every public indexable page builds its JSON-LD through the shared entity graph", async () => {
  const pages = [
    "src/components/LandingPage.astro",
    "src/components/FifteenHomesLanding.astro",
    "src/components/HomeV8Landing.astro",
    "src/pages/about-harbor.astro",
    "src/pages/privacy.astro",
    "src/pages/pilot-families.astro"
  ];

  for (const path of pages) {
    const page = await source(path);
    assert.match(page, /buildSeoEntityGraph/, path);
    assert.match(page, /structuredData=\{/, path);
  }
});

test("FAQ JSON-LD is sourced from the same visible FAQ collections", async () => {
  const [home, landingPage, pilot] = await Promise.all([
    source("src/components/HomeV8Landing.astro"),
    source("src/components/LandingPage.astro"),
    source("src/pages/pilot-families.astro")
  ]);

  assert.match(home, /faqItems\s*\n\s*\}\);/);
  assert.match(home, /faqItems\.map/);
  assert.match(landingPage, /faqItems\s*\n\s*\}\);/);
  assert.match(landingPage, /faqItems\.map/);
  assert.match(pilot, /faqItems: pilotFaqItems/);
  assert.match(pilot, /pilotFaqItems\.map/);
});
