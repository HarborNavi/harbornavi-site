create extension if not exists pgcrypto;

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  route text,
  path text,
  referrer text,
  form_location text,
  session_id text,
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table analytics_events add column if not exists visitor_id text;

create index if not exists analytics_events_created_at_idx on analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on analytics_events (event_name);
create index if not exists analytics_events_route_idx on analytics_events (route);
create index if not exists analytics_events_utm_source_idx on analytics_events (utm_source);
create index if not exists analytics_events_visitor_id_idx on analytics_events (visitor_id);
create index if not exists analytics_events_funnel_idx
  on analytics_events (route, utm_source, utm_campaign, form_location, created_at desc);
