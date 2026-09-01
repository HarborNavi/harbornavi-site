import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("all V7, V8, and V9 website images have clear upload placements", async () => {
  const media = await source("src/server/media.ts");
  const schema = await source("db/media.sql");
  const admin = await source("src/pages/admin666.astro");
  const placements = await source("src/data/siteMedia.ts");
  const loader = await source("src/components/SiteMediaLoader.astro");
  const home = await source("src/components/HomeV7Landing.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");
  const pilot = await source("src/pages/pilot-families.astro");
  const about = await source("src/pages/about-harbor.astro");
  assert.match(media, /image\/jpeg/);
  assert.match(media, /image\/png/);
  assert.match(media, /image\/gif/);
  assert.match(media, /siteMediaPlacementKeys/);
  assert.match(media, /payload\.action === "assign"/);
  assert.match(media, /update site_media set active = false where slot = \$\{slot\}/);
  assert.match(media, /create table if not exists site_media/);
  assert.doesNotMatch(media, /BLOB_READ_WRITE_TOKEN is not configured/);
  assert.doesNotMatch(media, /token:\s*blobToken/);
  assert.match(media, /await del\(String\(rows\[0\]\.url\)\)/);
  assert.match(schema, /site_media_slot_v3_check/);
  assert.match(schema, /home-carousel-pilot/);
  assert.match(schema, /about-harbor-os/);
  assert.match(admin, /accept="image\/jpeg,image\/png,image\/gif"/);
  assert.match(admin, /data-tab-button="media"/);
  assert.match(admin, /Website image locations/);
  assert.match(admin, /Upload and use/);
  assert.match(admin, /Restore default/);
  assert.doesNotMatch(admin, /<option value="page">Other page media<\/option>/);
  assert.equal((placements.match(/key: "/g) || []).length, 18);
  assert.match(placements, /pagePath: "\/home-v7, \/home-v8, and \/ \(final homepage\) - Top carousel, slide 1"/);
  assert.match(placements, /pagePath: "\/pilot-families - Hero"/);
  assert.match(placements, /pagePath: "\/about-harbor#founding-story - Smart speaker privacy scenario"/);
  assert.match(placements, /pagePath: "\/about-harbor#founding-story - Package camera scenario"/);
  assert.match(placements, /pagePath: "\/about-harbor - Project 02"/);
  assert.match(loader, /querySelectorAll\("\[data-media-slot\]"\)/);
  assert.match(loader, /home-carousel-memory/);
  assert.match(home, /data-media-slot="home-hardware"/);
  assert.match(homeV8, /data-media-slot="home-hardware"/);
  assert.match(pilot, /data-media-slot="pilot-hero"/);
  assert.match(about, /data-media-slot="about-story-speaker-privacy"/);
  assert.match(about, /data-media-slot="about-story-package-recorded"/);
  assert.match(about, /data-media-slot="about-harbor-os"/);

  const oldProductAssets = /home-v6-(?:pilot-families-v1|memory-hero-id|family-moment-id|homecoming-briefing-id|movie-night-id|trust-boundary-id|hardware-id)/;
  for (const activePage of [home, homeV8, pilot, about, placements]) {
    assert.doesNotMatch(activePage, oldProductAssets);
  }
  assert.match(pilot, /home-v7-v8-pilot-families-id\.webp/);
  assert.match(home, /harbor-inn-discord-banner-v2\.webp/);
  assert.match(homeV8, /harbor-inn-discord-banner-v2\.webp/);
  assert.match(placements, /Banner 2 - Harbor Inn Discord community/);
  assert.match(about, /home-v7-v8-memory-hero-id\.webp/);
  assert.match(about, /home-v7-v8-hardware-id\.webp/);
  assert.match(placements, /defaultUrl: "\/assets\/home-v7-v8-hardware-id\.webp"/);
});

test("V7 and V8 images recover from failed managed assets and WebP requests", async () => {
  const loader = await source("src/components/SiteMediaLoader.astro");
  const home = await source("src/components/HomeV7Landing.astro");
  const homeV8 = await source("src/components/HomeV8Landing.astro");

  assert.match(loader, /addEventListener\("error"/);
  assert.match(loader, /image\.complete && image\.naturalWidth === 0/);
  assert.match(loader, /currentSrc !== state\.defaultSrc/);
  assert.match(loader, /defaultSrc\.endsWith\("\.webp"\)/);
  assert.match(loader, /formatFallbackAttempted/);
  assert.match(loader, /fallbackState\.defaultAttempted = false/);

  const homeVersions = [home, homeV8];
  const versionedWebpUrls = homeVersions.map((page) => [...new Set([...page.matchAll(/\/assets\/[a-z0-9-]+\.webp/g)].map(([url]) => url))]);
  for (const webpUrls of versionedWebpUrls) {
    assert.ok(webpUrls.length > 0);
    for (const webpUrl of webpUrls) {
      const pngUrl = webpUrl.replace(/\.webp$/, ".png");
      await assert.doesNotReject(() => readFile(new URL(`public${pngUrl}`, root)));
    }
  }
  assert.deepEqual(versionedWebpUrls[1].sort(), versionedWebpUrls[0].sort());
  assert.ok(versionedWebpUrls[0].some((url) => url.includes("home-v7-v8-")));
});
