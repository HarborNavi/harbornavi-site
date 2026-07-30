import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validatePilotApplication } from "../src/server/pilot-validation.ts";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("pilot application validates the six required answers", () => {
  const valid = validatePilotApplication({
    name: "Taylor Morgan",
    email: "taylor@example.com",
    zip_code: "06510",
    smart_devices: "Home Assistant, cameras, lights",
    interest_reason: "We want to test private home memory.",
    referral_source: "search"
  });
  assert.ok("application" in valid);
  assert.equal(valid.application.email, "taylor@example.com");
  assert.deepEqual(validatePilotApplication({
    name: "Taylor",
    email: "invalid",
    zip_code: "123",
    smart_devices: "",
    interest_reason: "",
    referral_source: ""
  }), { error: "A valid email is required." });
});

test("pilot campaign banner and form stay on the approved contract", async () => {
  const home = await source("src/components/HomeV7Landing.astro");
  const page = await source("src/pages/pilot-families.astro");
  const admin = await source("src/pages/admin666.astro");
  const adminHealth = await source("api/admin/health.ts");
  const pilotApplications = await source("src/server/pilot-applications.ts");
  const vercel = JSON.parse(await source("vercel.json"));
  assert.match(home, /Be One of the First 5 Pilot Families/);
  assert.match(home, /earn up to \$500 in rewards/);
  assert.match(home, /href: "\/pilot-families"/);
  assert.match(home, /data-route="home-v7"/);
  for (const field of ["name", "email", "zip_code", "smart_devices", "interest_reason", "referral_source"]) {
    assert.match(page, new RegExp(`name="${field}"`));
  }
  assert.match(page, /does not subscribe you to marketing email/);
  assert.match(page, /brand-new HarborNavi device/);
  assert.match(page, /lifetime subscription-free access/);
  assert.match(page, /\$500 completion bonus/);
  assert.match(page, /two weeks/);
  assert.match(page, /one or two short vlogs/);
  assert.match(page, /What's expected of pilot testers\?/);
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
  assert.match(admin, /Export CSV/);
  assert.match(adminHealth, /listPilotApplications/);
  assert.match(pilotApplications, /from pilot_family_applications/);
  assert.match(pilotApplications, /create table if not exists pilot_family_applications/);
  const listFunction = pilotApplications.slice(pilotApplications.indexOf("export async function listPilotApplications"));
  assert.doesNotMatch(listFunction, /\bmetadata\b/);
});
