import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  factsLastReviewedIso,
  harborFactQuestions,
  harborFactSources
} from "../src/data/harborFacts.ts";
import {
  comparisonFaqItems,
  comparisonProducts,
  comparisonRows,
  comparisonSources
} from "../src/data/comparison.ts";
import { homeAssistantLocalAiGuide, localFirstHomeAiGuide } from "../src/data/geoGuides.ts";
import { buildSeoEntityGraph, harborAbsoluteUrl } from "../src/data/seoEntities.ts";
import { classifyAiReferral, geoContentRoutes } from "../src/server/geo-referrals.ts";

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
    faqItems: [{ question: "Where is footage processed?", answer: "On the HarborNavi device in your home." }],
    citations: ["/facts", "https://www.onvif.org/profiles/"],
    dateModified: "2026-09-23"
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
  assert.deepEqual(webpage.citation, [
    { "@type": "CreativeWork", url: "https://harbornavi.com/facts" },
    { "@type": "CreativeWork", url: "https://www.onvif.org/profiles/" }
  ]);
  assert.equal(webpage.dateModified, "2026-09-23");
  assert.equal(faq.mainEntity[0].name, "Where is footage processed?");
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "On the HarborNavi device in your home.");
});

test("article GEO graph connects TechArticle, webpage, citations, and dates", () => {
  const graph = buildSeoEntityGraph({
    title: "What Is Local-First Home AI?",
    description: "A sourced guide.",
    path: "/local-first-home-ai",
    image: "/assets/home-v7-v8-trust-boundary-id.png",
    mainEntity: "article",
    faqItems: [{ question: "Does local-first mean offline?", answer: "No. It describes the default data and control boundary." }],
    citations: ["/facts", "https://www.home-assistant.io/faq/is-my-data-private/"],
    datePublished: "2026-09-23",
    dateModified: "2026-09-23"
  });

  const article = graph["@graph"].find((entity) => entity["@type"] === "TechArticle");
  const webpage = graph["@graph"].find((entity) => entity["@type"] === "WebPage");
  assert.equal(article.headline, "What Is Local-First Home AI?");
  assert.equal(article.datePublished, "2026-09-23");
  assert.equal(article.dateModified, "2026-09-23");
  assert.deepEqual(webpage.mainEntity, { "@id": article["@id"] });
  assert.equal(article.citation.length, 2);
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
    "src/components/TopicGuide.astro",
    "src/pages/about-harbor.astro",
    "src/pages/compare.astro",
    "src/pages/facts.astro",
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
  const [home, landingPage, pilot, facts] = await Promise.all([
    source("src/components/HomeV8Landing.astro"),
    source("src/components/LandingPage.astro"),
    source("src/pages/pilot-families.astro"),
    source("src/pages/facts.astro")
  ]);

  assert.match(home, /faqItems,/);
  assert.match(home, /faqItems\.map/);
  assert.match(landingPage, /faqItems/);
  assert.match(landingPage, /faqItems\.map/);
  assert.match(pilot, /faqItems: pilotFaqItems/);
  assert.match(pilot, /pilotFaqItems\.map/);
  assert.match(facts, /faqItems: harborFactQuestions/);
  assert.match(facts, /harborFactQuestions\.map/);
});

test("the fact sheet keeps answer evidence and official references internally consistent", () => {
  const sourceIds = new Set(harborFactSources.map((sourceItem) => sourceItem.id));
  const citedSourceIds = new Set(harborFactQuestions.flatMap((question) => question.sourceIds));

  assert.equal(factsLastReviewedIso, "2026-09-23");
  assert.ok(harborFactQuestions.length >= 8);
  assert.ok(harborFactSources.length >= 10);
  assert.equal(sourceIds.size, harborFactSources.length);

  for (const question of harborFactQuestions) {
    assert.ok(question.question.endsWith("?"), question.id);
    assert.ok(question.answer.length >= 80, question.id);
    assert.ok(question.sourceIds.length > 0, question.id);
    question.sourceIds.forEach((sourceId) => assert.ok(sourceIds.has(sourceId), `${question.id}: ${sourceId}`));
  }

  for (const sourceItem of harborFactSources.filter((item) => item.external)) {
    assert.match(sourceItem.href, /^https:\/\//, sourceItem.id);
  }

  assert.deepEqual(citedSourceIds, sourceIds);
});

test("the comparison page and homepage share one sourced comparison dataset", async () => {
  const [home, comparisonPage] = await Promise.all([
    source("src/components/HomeV8Landing.astro"),
    source("src/pages/compare.astro")
  ]);

  assert.equal(comparisonProducts.length, 5);
  assert.equal(comparisonRows.length, 7);
  assert.ok(comparisonSources.length >= 10);
  assert.ok(comparisonFaqItems.length >= 5);
  assert.ok(comparisonProducts[0].featured);
  comparisonRows.forEach((row) => assert.equal(row.length, comparisonProducts.length + 1));
  comparisonSources.forEach((item) => assert.match(item.href, /^https:\/\//));
  assert.match(home, /from "\.\.\/data\/comparison"/);
  assert.match(comparisonPage, /comparisonProducts\.map/);
  assert.match(comparisonPage, /comparisonRows\.map/);
  assert.match(comparisonPage, /comparisonSources\.map/);
  assert.match(comparisonPage, /Method and limits/);
});

test("topic guides keep body and FAQ citations tied to visible sources", () => {
  for (const guide of [localFirstHomeAiGuide, homeAssistantLocalAiGuide]) {
    const sourceIds = new Set(guide.sources.map((item) => item.id));
    assert.ok(guide.sections.length >= 4, guide.route);
    assert.ok(guide.faqs.length >= 4, guide.route);
    assert.ok(guide.sources.length >= 6, guide.route);
    assert.match(guide.directAnswer, /local|Home Assistant|HarborNavi/i);
    for (const item of [...guide.sections, ...guide.faqs]) {
      assert.ok(item.sourceIds.length > 0, `${guide.route}: missing source`);
      item.sourceIds.forEach((sourceId) => assert.ok(sourceIds.has(sourceId), `${guide.route}: ${sourceId}`));
    }
  }
});

test("GEO referral classification recognizes supported AI sources without labeling ordinary search", () => {
  assert.equal(classifyAiReferral("https://chatgpt.com/c/abc", ""), "ChatGPT");
  assert.equal(classifyAiReferral("https://www.perplexity.ai/search/example", ""), "Perplexity");
  assert.equal(classifyAiReferral("", "google-ai"), "Gemini");
  assert.equal(classifyAiReferral("https://copilot.microsoft.com/", ""), "Microsoft Copilot");
  assert.equal(classifyAiReferral("", "anthropic"), "Claude");
  assert.equal(classifyAiReferral("https://www.google.com/search?q=harbornavi", "google"), null);
  assert.equal(classifyAiReferral("not-a-url", "newsletter"), null);
  assert.deepEqual(geoContentRoutes, ["facts", "compare", "local-first-home-ai", "home-assistant-local-ai", "package", "pets"]);
});

test("the authenticated dashboard reports observable GEO traffic and states its limits", async () => {
  const [analytics, admin, campaign, privacy] = await Promise.all([
    source("src/server/analytics.ts"),
    source("src/pages/admin666.astro"),
    source("src/components/CampaignAnalytics.astro"),
    source("src/pages/privacy.astro")
  ]);

  assert.match(analytics, /classifyAiReferral/);
  assert.match(analytics, /geo_summary: geoSummary/);
  assert.match(analytics, /geo_content: geoContentRows/);
  assert.match(analytics, /geo_referrals: geoReferralRows/);
  assert.match(admin, /GEO visibility/);
  assert.match(admin, /does not count unclicked citations, answer impressions, or crawler fetches/);
  assert.match(admin, /data-geo-referrals-body/);
  assert.match(campaign, /safeReferrer/);
  assert.doesNotMatch(campaign, /document\.referrer\s*[,}]/);
  assert.match(privacy, /derives an AI-service source label from the referring page or UTM/);
  assert.match(privacy, /not unclicked citations, answer\s+impressions, or crawler requests/);
});

test("GEO content is discoverable from the sitemap, navigation, and related pages", async () => {
  const [sitemap, sharedHeader, legacyHeader, factsPage, ...linkedPages] = await Promise.all([
    source("public/sitemap.xml"),
    source("src/components/SiteHeaderV7.astro"),
    source("src/components/SiteHeader.astro"),
    source("src/pages/facts.astro"),
    source("src/components/HomeV8Landing.astro"),
    source("src/components/LandingPage.astro"),
    source("src/components/FifteenHomesLanding.astro"),
    source("src/pages/about-harbor.astro"),
    source("src/pages/pilot-families.astro"),
    source("src/pages/privacy.astro")
  ]);

  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/facts<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/compare<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/local-first-home-ai<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/harbornavi\.com\/home-assistant-local-ai<\/loc>/);
  assert.match(sharedHeader, /href="\/facts"/);
  assert.match(sharedHeader, /href="\/compare"/);
  assert.match(legacyHeader, /href="\/facts"/);
  assert.match(factsPage, /harborFactSources\.map/);
  assert.match(factsPage, /Last reviewed/);
  assert.match(factsPage, /href="\/local-first-home-ai"/);
  assert.match(factsPage, /href="\/home-assistant-local-ai"/);

  for (const page of linkedPages) {
    assert.match(page, /href="\/facts"/, "missing internal Facts link");
  }
});
