import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validatePilotApplication } from "../src/server/pilot-validation.ts";
import {
  arePilotApplicationsOpen,
  pilotApplicationDeadline,
  pilotOfferAdvertisingCopy,
  pilotSpotCount,
  pilotRewardAdvertisingCopy
} from "../src/data/pilotProgram.ts";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("pilot application validates the six required answers", () => {
  const valid = validatePilotApplication({
    name: "Taylor Morgan",
    email: "taylor@example.com",
    zip_code: "06510",
    smart_devices: "Home Assistant, cameras, lights",
    interest_reason: "We want to test private home memory.",
    referral_source: "search",
    route: "pilot-families",
    path: "/pilot-families",
    utm_source: "youtube",
    utm_campaign: "pilot-launch"
  });
  assert.ok("application" in valid);
  assert.equal(valid.application.email, "taylor@example.com");
  assert.equal(valid.application.utm_source, "youtube");
  assert.equal(valid.application.utm_campaign, "pilot-launch");
  assert.deepEqual(validatePilotApplication({
    name: "Taylor",
    email: "invalid",
    zip_code: "123",
    smart_devices: "",
    interest_reason: "",
    referral_source: ""
  }), { error: "A valid email is required." });
});

test("pilot application deadline is shared by the page and API", async () => {
  const page = await source("src/pages/pilot-families.astro");
  const api = await source("api/waitlist.ts");
  assert.equal(pilotApplicationDeadline, "2026-09-15T23:59:59-07:00");
  assert.equal(arePilotApplicationsOpen(Date.parse("2026-09-15T23:59:58-07:00")), true);
  assert.equal(arePilotApplicationsOpen(Date.parse("2026-09-16T00:00:00-07:00")), false);
  assert.match(page, /pilotApplicationDeadline/);
  assert.match(api, /arePilotApplicationsOpen/);
  assert.match(api, /status: 410/);
});

test("pilot campaign banner and form stay on the approved contract", async () => {
  const home = await source("src/components/HomeV7Landing.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const page = await source("src/pages/pilot-families.astro");
  const admin = await source("src/pages/admin666.astro");
  const adminHealth = await source("api/admin/health.ts");
  const pilotApplications = await source("src/server/pilot-applications.ts");
  const vercel = JSON.parse(await source("vercel.json"));
  assert.equal(pilotSpotCount, 10);
  assert.equal(pilotOfferAdvertisingCopy, "Yours to keep plus $300.");
  assert.equal(pilotRewardAdvertisingCopy, "Receive $300 after completing the agreed milestones.");
  assert.match(home, /Join the First \$\{pilotSpotCount\} Pilot Families/);
  assert.match(homeV8, /Join the First \$\{pilotSpotCount\} Pilot Families/);
  assert.match(home, /pilotOfferAdvertisingCopy/);
  assert.match(homeV8, /pilotOfferAdvertisingCopy/);
  assert.match(page, /pilotOfferAdvertisingCopy/);
  assert.match(page, /pilotRewardAdvertisingCopy/);
  for (const publicSource of [home, homeV8, page]) {
    assert.doesNotMatch(publicSource, /First 5|Five families|Five homes|up to \$500|\+\$500|\$500 completion bonus|\$500 bonus terms/i);
  }
  assert.match(home, /href: "\/pilot-families"/);
  assert.match(home, /class="site-header-v7-cta" href="\/pilot-families">Join the Pilot Program<\/a>/);
  assert.match(home, /data-route="home-v7"/);
  assert.match(homeV8, /const route = isV9 \? "home-v9" : "home-v8"/);
  assert.match(home, /Join the waitlist/);
  assert.match(home, /early-bird pricing/);
  assert.match(home, /Enter your email for early-bird pricing and launch updates\./);
  assert.match(home, /What is the difference between the waitlist and the Pilot Program\?/);
  assert.match(home, /Joining the waitlist does not submit a Pilot Program application\./);
  assert.match(home, /href="\/about-harbor"/);
  for (const field of ["name", "email", "zip_code", "smart_devices", "interest_reason", "referral_source"]) {
    assert.match(page, new RegExp(`name="${field}"`));
  }
  assert.match(page, /does not subscribe you to marketing email/);
  assert.match(page, /pilot_apply_start/);
  assert.match(page, /pilot_apply_submit/);
  assert.match(page, /pilot_apply_saved/);
  assert.match(page, /pilot_apply_error/);
  assert.match(page, /session_id: getSessionId\(\)/);
  assert.match(page, /utm_campaign: utm\.utm_campaign/);
  assert.match(page, /brand-new HarborNavi device/);
  assert.match(page, /lifetime subscription-free access/);
  assert.match(page, /Milestone-based reward/);
  assert.match(page, /two weeks/);
  assert.match(page, /one or two short vlogs/);
  assert.match(page, /clearly and conspicuously disclose their material connection/);
  assert.match(page, /cash compensation, free or provided HarborNavi device/);
  assert.match(page, /include the disclosure clearly in the video itself/);
  assert.match(page, /both visible on-screen text and a spoken disclosure/);
  assert.match(page, /ftc\.gov\/business-guidance\/resources\/disclosures-101-social-media-influencers/);
  assert.match(page, /What must I disclose in a vlog, review, or post\?/);
  assert.match(page, /What will my family need to do\?/);
  assert.match(page, /How difficult is installation\?/);
  assert.match(page, /about 30 minutes/);
  assert.match(page, /<SiteHeader ctaHref="#apply" \/>/);
  assert.match(page, /Only \{pilotSpotCount\} pilot spots/);
  assert.match(page, /\{pilotSpotCount\} families will be selected/);
  assert.match(page, /\{pilotSpotCount\} homes\. Real feedback\./);
  assert.match(page, /data-pilot-countdown/);
  assert.match(page, /Applications close \{pilotApplicationDeadlineShortLabel\}/);
  assert.match(page, /data-countdown-days/);
  assert.match(page, /What equipment do I need\?/);
  assert.match(page, /How long is the pilot program\?/);
  assert.match(page, /Do I get to keep the device\?/);
  assert.match(page, /What happens after the pilot\?/);
  assert.match(page, /Home data is processed locally on HarborNavi/);
  assert.doesNotMatch(page, /Tell us about your home/);
  assert.deepEqual(vercel.rewrites.find((rewrite) => rewrite.source === "/api/pilot-application"), {
    source: "/api/pilot-application",
    destination: "/api/waitlist?action=pilot"
  });
  assert.deepEqual(vercel.rewrites.find((rewrite) => rewrite.source === "/api/admin/pilot-applications"), {
    source: "/api/admin/pilot-applications",
    destination: "/api/admin/health?action=pilot-applications"
  });
  assert.match(admin, /data-tab-button="pilot-applications"/);
  assert.match(admin, /data-pilot-applications-body/);
  assert.match(admin, /Attribution/);
  assert.match(admin, /data-waitlist-funnel-body/);
  assert.match(admin, /data-pilot-funnel-body/);
  assert.match(admin, /Unique visitors/);
  assert.match(admin, /Export CSV/);
  assert.match(adminHealth, /listPilotApplications/);
  assert.match(pilotApplications, /from pilot_family_applications/);
  assert.match(pilotApplications, /create table if not exists pilot_family_applications/);
  assert.match(pilotApplications, /visitor_id/);
  assert.match(pilotApplications, /utm_source/);
  const listFunction = pilotApplications.slice(pilotApplications.indexOf("export async function listPilotApplications"));
  assert.doesNotMatch(listFunction, /\bmetadata\b/);
});

test("about harbor presents the approved company story without fabricated names", async () => {
  const about = await source("src/pages/about-harbor.astro");
  assert.match(about, /https:\/\/harbornavi\.com\/about-harbor/);
  assert.match(about, /Harbor Innovations/);
  assert.match(about, /Our homes kept recording\. They still forgot us\./);
  assert.match(about, /What time will Alex be out tomorrow\?/);
  assert.match(about, /No identity check/);
  assert.match(about, /Recorded\. No alert sent\./);
  assert.match(about, /A useful home should recognize the situation and notify the owner/);
  assert.match(about, /A home memory should last a lifetime/);
  assert.match(about, /Privacy is not a premium feature/);
  assert.match(about, /Nexus AI Workstation/);
  assert.match(about, /about-nexus-workstation-v1\.jpg/);
  assert.match(about, /Harbor OS/);
  assert.match(about, /Names and formal endorsements will be published only with permission/);
  assert.match(about, /\/pilot-families#apply/);
});

test("public child pages use their requested home navigation target", async () => {
  const header = await source("src/components/SiteHeaderV7.astro");
  const headerStyles = await source("src/styles/site-header-v7.css");
  const home = await source("src/components/HomeV8Landing.astro");
  const about = await source("src/pages/about-harbor.astro");
  const pilot = await source("src/pages/pilot-families.astro");
  const privacy = await source("src/pages/privacy.astro");

  assert.match(home, /import "\.\.\/styles\/site-header-v7\.css"/);
  assert.match(home, /class="site-header-v7"/);
  assert.match(header, /class="site-header-v7"/);
  assert.match(header, /width="42" height="23"/);
  assert.match(header, /homeHref = "\/"/);
  assert.match(header, /\$\{homeHref\}#intelligence/);
  assert.match(header, /\$\{homeHref\}#compare/);
  assert.match(header, /Join the Pilot Program/);
  assert.match(header, /data-header-menu/);
  assert.match(header, /aria-controls="site-header-v7-navigation"/);
  assert.match(home, /data-header-menu/);
  assert.match(home, /SiteHeaderMenu/);
  assert.match(headerStyles, /width: min\(1280px, calc\(100% - 64px\)\)/);
  assert.match(headerStyles, /min-height: 78px/);
  assert.match(headerStyles, /font-size: 13px/);
  assert.match(headerStyles, /@media \(max-width: 900px\)/);
  assert.match(headerStyles, /data-menu-open="true"/);
  assert.match(headerStyles, /justify-self: stretch/);
  assert.doesNotMatch(headerStyles, /overflow-x: auto/);
  assert.match(about, /SiteHeaderV7\.astro/);
  assert.match(pilot, /SiteHeaderV7\.astro/);
  assert.match(privacy, /SiteHeaderV7\.astro/);
  for (const page of [about, pilot, privacy]) {
    assert.doesNotMatch(page, /href="\/home-v[678]"/);
    assert.match(page, /href="\/"/);
  }
  assert.doesNotMatch(about, /note="About Harbor"/);
  assert.doesNotMatch(pilot, /Only \$\{pilotSpotCount\} spots/);
});

test("pilot families uses the final black and purple visual system", async () => {
  const page = await source("src/pages/pilot-families.astro");
  const styles = await source("src/styles/pilot-families.css");

  assert.match(page, /<meta name="theme-color" content="#0c0c12" \/>/);
  for (const color of ["#0c0c12", "#15151e", "#1e1e2a", "#6d5bd0", "#9b85f5", "#e9c9a8", "#ececf3", "#9b9bac", "#2a2a38"]) {
    assert.match(styles, new RegExp(color));
  }
  assert.match(styles, /\.pilot-page \.site-header-v7-bar/);
  assert.match(styles, /\.pilot-spots span \{[^}]*background: #8b73ee;[^}]*box-shadow:/s);
  assert.match(styles, /\.pilot-privacy \{[^}]*padding: 96px clamp\(32px, 4vw, 64px\);/s);
  assert.doesNotMatch(styles, /\.pilot-privacy \{[^}]*padding: 96px max\(/s);
  assert.match(styles, /\.pilot-application form \{[^}]*background: var\(--pilot-surface\);/s);
  assert.doesNotMatch(styles, /#fbfafc|#ff6b5e|#eef9f6/);
});
