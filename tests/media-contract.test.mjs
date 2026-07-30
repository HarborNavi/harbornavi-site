import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = async (path) => readFile(new URL(path, root), "utf8");

test("hero media supports three active uploads and the approved image types", async () => {
  const media = await source("src/server/media.ts");
  const schema = await source("db/media.sql");
  const admin = await source("src/pages/admin666.astro");
  assert.match(media, /image\/jpeg/);
  assert.match(media, /image\/png/);
  assert.match(media, /image\/gif/);
  assert.match(media, /pilot campaign occupies the first slot/);
  assert.match(media, /create table if not exists site_media/);
  assert.doesNotMatch(media, /BLOB_READ_WRITE_TOKEN is not configured/);
  assert.doesNotMatch(media, /token:\s*blobToken/);
  assert.match(media, /await del\(String\(rows\[0\]\.url\)\)/);
  assert.match(schema, /slot in \('hero-carousel', 'page'\)/);
  assert.match(admin, /accept="image\/jpeg,image\/png,image\/gif"/);
  assert.match(admin, /data-tab-button="media"/);
});
