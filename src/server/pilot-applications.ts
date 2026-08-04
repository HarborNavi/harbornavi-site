import { sql } from "./db.js";
import { validatePilotApplication, type PilotApplicationInput } from "./pilot-validation.js";

let pilotTableReady: Promise<void> | null = null;

async function initializePilotTable() {
  const db = sql();
  await db`create extension if not exists pgcrypto`;
  await db`
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
    )
  `;
  await db`alter table pilot_family_applications add column if not exists route text`;
  await db`alter table pilot_family_applications add column if not exists path text`;
  await db`alter table pilot_family_applications add column if not exists referrer text`;
  await db`alter table pilot_family_applications add column if not exists session_id text`;
  await db`alter table pilot_family_applications add column if not exists visitor_id text`;
  await db`alter table pilot_family_applications add column if not exists utm_source text`;
  await db`alter table pilot_family_applications add column if not exists utm_medium text`;
  await db`alter table pilot_family_applications add column if not exists utm_campaign text`;
  await db`alter table pilot_family_applications add column if not exists utm_content text`;
  await db`alter table pilot_family_applications add column if not exists utm_term text`;
  await db`create index if not exists pilot_family_applications_status_idx on pilot_family_applications (status, created_at desc)`;
  await db`create index if not exists pilot_family_applications_attribution_idx on pilot_family_applications (utm_source, utm_campaign, created_at desc)`;
  await db`create index if not exists pilot_family_applications_visitor_idx on pilot_family_applications (visitor_id)`;
}

function ensurePilotTable() {
  if (!pilotTableReady) {
    pilotTableReady = initializePilotTable().catch((error) => {
      pilotTableReady = null;
      throw error;
    });
  }
  return pilotTableReady;
}

export async function savePilotApplication(input: PilotApplicationInput) {
  const validated = validatePilotApplication(input);
  if ("error" in validated) return validated;
  await ensurePilotTable();
  const application = validated.application;
  const rows = await sql()`
    insert into pilot_family_applications (
      name, email, zip_code, smart_devices, interest_reason, referral_source,
      route, path, referrer, session_id, visitor_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      metadata
    ) values (
      ${application.name}, ${application.email}, ${application.zip_code}, ${application.smart_devices},
      ${application.interest_reason}, ${application.referral_source},
      ${application.route || null}, ${application.path || null}, ${application.referrer || null},
      ${application.session_id || null}, ${application.visitor_id || null},
      ${application.utm_source || null}, ${application.utm_medium || null}, ${application.utm_campaign || null},
      ${application.utm_content || null}, ${application.utm_term || null},
      ${JSON.stringify(application.metadata)}::jsonb
    )
    on conflict (email) do update set
      name = excluded.name,
      zip_code = excluded.zip_code,
      smart_devices = excluded.smart_devices,
      interest_reason = excluded.interest_reason,
      referral_source = excluded.referral_source,
      route = coalesce(excluded.route, pilot_family_applications.route),
      path = coalesce(excluded.path, pilot_family_applications.path),
      referrer = coalesce(excluded.referrer, pilot_family_applications.referrer),
      session_id = coalesce(excluded.session_id, pilot_family_applications.session_id),
      visitor_id = coalesce(excluded.visitor_id, pilot_family_applications.visitor_id),
      utm_source = coalesce(excluded.utm_source, pilot_family_applications.utm_source),
      utm_medium = coalesce(excluded.utm_medium, pilot_family_applications.utm_medium),
      utm_campaign = coalesce(excluded.utm_campaign, pilot_family_applications.utm_campaign),
      utm_content = coalesce(excluded.utm_content, pilot_family_applications.utm_content),
      utm_term = coalesce(excluded.utm_term, pilot_family_applications.utm_term),
      metadata = pilot_family_applications.metadata || excluded.metadata,
      updated_at = now()
    returning id, email, status, created_at, updated_at
  `;
  return { application: rows[0] } as const;
}

export async function listPilotApplications() {
  await ensurePilotTable();
  return sql()`
    select
      id,
      name,
      email,
      zip_code,
      smart_devices,
      interest_reason,
      referral_source,
      route,
      path,
      referrer,
      session_id,
      visitor_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      status,
      created_at,
      updated_at
    from pilot_family_applications
    order by created_at desc
    limit 500
  `;
}
