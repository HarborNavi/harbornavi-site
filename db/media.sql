create extension if not exists pgcrypto;

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
);

create index if not exists site_media_slot_active_idx on site_media (slot, active, created_at desc);
