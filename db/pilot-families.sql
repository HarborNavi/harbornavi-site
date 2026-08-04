create extension if not exists pgcrypto;

create table if not exists pilot_family_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  zip_code text not null,
  smart_devices text not null,
  interest_reason text not null,
  referral_source text not null,
  route text,
  path text,
  referrer text,
  session_id text,
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_family_status_check check (status in ('new', 'reviewing', 'selected', 'not_selected'))
);

alter table pilot_family_applications add column if not exists route text;
alter table pilot_family_applications add column if not exists path text;
alter table pilot_family_applications add column if not exists referrer text;
alter table pilot_family_applications add column if not exists session_id text;
alter table pilot_family_applications add column if not exists visitor_id text;
alter table pilot_family_applications add column if not exists utm_source text;
alter table pilot_family_applications add column if not exists utm_medium text;
alter table pilot_family_applications add column if not exists utm_campaign text;
alter table pilot_family_applications add column if not exists utm_content text;
alter table pilot_family_applications add column if not exists utm_term text;

create index if not exists pilot_family_applications_status_idx on pilot_family_applications (status, created_at desc);
create index if not exists pilot_family_applications_attribution_idx on pilot_family_applications (utm_source, utm_campaign, created_at desc);
create index if not exists pilot_family_applications_visitor_idx on pilot_family_applications (visitor_id);
