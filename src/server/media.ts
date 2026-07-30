import { del, put } from "@vercel/blob";
import { getBearerToken, verifyAdminToken } from "./auth.js";
import { jsonResponse } from "./config.js";
import { sql } from "./db.js";

const maxFileSize = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
const allowedSlots = new Set(["hero-carousel", "page"]);
let mediaTableReady: Promise<void> | null = null;

const defaultHeroAssets = [
  { id: "default-family", slot: "hero-carousel", url: "/assets/home-v6-memory-hero-id.webp", filename: "home-v6-memory-hero-id.webp", mime_type: "image/webp", size_bytes: 0, alt_text: "A family sharing a small moment at home while HarborNavi keeps the memory private.", active: true },
  { id: "default-movie-night", slot: "hero-carousel", url: "/assets/home-v6-movie-night-id.webp", filename: "home-v6-movie-night-id.webp", mime_type: "image/webp", size_bytes: 0, alt_text: "A movie night moment captured as part of a private home timeline.", active: true }
];

async function initializeMediaTable() {
  const db = sql();
  await db`create extension if not exists pgcrypto`;
  await db`
    create table if not exists site_media (
      id uuid primary key default gen_random_uuid(),
      slot text not null,
      url text not null,
      filename text not null,
      mime_type text not null,
      size_bytes integer not null,
      alt_text text not null default '',
      active boolean not null default false,
      created_at timestamptz not null default now(),
      constraint site_media_slot_check check (slot in ('hero-carousel', 'page')),
      constraint site_media_mime_type_check check (mime_type in ('image/jpeg', 'image/png', 'image/gif'))
    )
  `;
  await db`create index if not exists site_media_slot_active_idx on site_media (slot, active, created_at desc)`;
}

function ensureMediaTable() {
  if (!mediaTableReady) {
    mediaTableReady = initializeMediaTable().catch((error) => {
      mediaTableReady = null;
      throw error;
    });
  }
  return mediaTableReady;
}

function unauthorized() {
  return jsonResponse({ error: "Unauthorized" }, { status: 401 });
}

function serializeMedia(row: Record<string, unknown>) {
  return {
    id: String(row.id), slot: String(row.slot), url: String(row.url), filename: String(row.filename),
    mime_type: String(row.mime_type), size_bytes: Number(row.size_bytes), alt_text: String(row.alt_text || ""),
    active: Boolean(row.active), created_at: row.created_at
  };
}

async function listMedia(activeOnly = false) {
  await ensureMediaTable();
  const rows = activeOnly
    ? await sql()`select id, slot, url, filename, mime_type, size_bytes, alt_text, active, created_at from site_media where slot = 'hero-carousel' and active = true order by created_at asc limit 3`
    : await sql()`select id, slot, url, filename, mime_type, size_bytes, alt_text, active, created_at from site_media order by created_at desc`;
  return rows.map((row) => serializeMedia(row as Record<string, unknown>));
}

export async function handleMediaRequest(request: Request) {
  if (request.method === "GET") {
    const isAdmin = verifyAdminToken(getBearerToken(request));
    try {
      if (isAdmin) return jsonResponse({ assets: await listMedia() });
      const assets = await listMedia(true);
      return jsonResponse({ assets: assets.length ? assets : defaultHeroAssets }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
    } catch (error) {
      if (isAdmin) {
        console.error(error);
        return jsonResponse({ error: "Media table is not ready. Run db/media.sql first." }, { status: 503 });
      }
      return jsonResponse({ assets: defaultHeroAssets }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
    }
  }

  if (!verifyAdminToken(getBearerToken(request))) return unauthorized();

  try {
    await ensureMediaTable();
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Unable to initialize media storage." }, { status: 503 });
  }

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const slot = String(form.get("slot") || "page");
      const altText = String(form.get("alt_text") || "").trim().slice(0, 240);
      if (!(file instanceof File)) return jsonResponse({ error: "Choose an image file." }, { status: 400 });
      if (!allowedMimeTypes.has(file.type)) return jsonResponse({ error: "Only JPG, PNG, and GIF images are supported." }, { status: 400 });
      if (file.size > maxFileSize) return jsonResponse({ error: "Images must be 10 MB or smaller." }, { status: 400 });
      if (!allowedSlots.has(slot)) return jsonResponse({ error: "Invalid media slot." }, { status: 400 });
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "upload";
        const blob = await put(`harbornavi/${slot}/${Date.now()}-${safeName}`, file, { access: "public", addRandomSuffix: true, contentType: file.type });
        const rows = await sql()`insert into site_media (slot, url, filename, mime_type, size_bytes, alt_text) values (${slot}, ${blob.url}, ${file.name}, ${file.type}, ${file.size}, ${altText}) returning id, slot, url, filename, mime_type, size_bytes, alt_text, active, created_at`;
        return jsonResponse({ asset: serializeMedia(rows[0] as Record<string, unknown>) }, { status: 201 });
      } catch (error) {
        console.error(error);
        return jsonResponse({ error: "Upload failed. Check Blob storage and the media table." }, { status: 500 });
      }
    }
    let payload: { action?: string; id?: string; active?: boolean };
    try { payload = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, { status: 400 }); }
    if (payload.action !== "set-active" || !payload.id || typeof payload.active !== "boolean") return jsonResponse({ error: "Invalid media action." }, { status: 400 });
    try {
      const selected = await sql()`select id, slot from site_media where id = ${payload.id} limit 1`;
      if (!selected.length) return jsonResponse({ error: "Media asset not found." }, { status: 404 });
      if (payload.active && selected[0].slot === "hero-carousel") {
        const count = await sql()`select count(*)::int as count from site_media where slot = 'hero-carousel' and active = true and id <> ${payload.id}`;
        if (Number(count[0].count) >= 2) return jsonResponse({ error: "The hero carousel has two upload-managed slots because the pilot campaign occupies the first slot." }, { status: 400 });
      }
      const rows = await sql()`update site_media set active = ${payload.active} where id = ${payload.id} returning id, slot, url, filename, mime_type, size_bytes, alt_text, active, created_at`;
      return jsonResponse({ asset: serializeMedia(rows[0] as Record<string, unknown>) });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Could not update the media asset." }, { status: 500 });
    }
  }

  if (request.method === "DELETE") {
    let payload: { id?: string };
    try { payload = await request.json(); } catch { return jsonResponse({ error: "Invalid JSON body" }, { status: 400 }); }
    if (!payload.id) return jsonResponse({ error: "Media id is required." }, { status: 400 });
    try {
      const rows = await sql()`delete from site_media where id = ${payload.id} returning url`;
      if (!rows.length) return jsonResponse({ error: "Media asset not found." }, { status: 404 });
      if (String(rows[0].url).startsWith("http")) await del(String(rows[0].url));
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: "Could not delete the media asset." }, { status: 500 });
    }
  }

  return jsonResponse({ error: "Method not allowed" }, { status: 405 });
}
