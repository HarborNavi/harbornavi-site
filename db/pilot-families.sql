create extension if not exists pgcrypto;

create table if not exists pilot_family_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  zip_code text not null,
  smart_devices text not null,
  interest_reason text not null,
  referral_source text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_family_status_check check (status in ('new', 'reviewing', 'selected', 'not_selected'))
);

create index if not exists pilot_family_applications_status_idx on pilot_family_applications (status, created_at desc);
