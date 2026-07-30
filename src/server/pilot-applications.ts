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
      metadata jsonb not null default '{}'::jsonb,
      status text not null default 'new',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint pilot_family_status_check check (status in ('new', 'reviewing', 'selected', 'not_selected'))
    )
  `;
  await db`create index if not exists pilot_family_applications_status_idx on pilot_family_applications (status, created_at desc)`;
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
      name, email, zip_code, smart_devices, interest_reason, referral_source, metadata
    ) values (
      ${application.name}, ${application.email}, ${application.zip_code}, ${application.smart_devices},
      ${application.interest_reason}, ${application.referral_source}, ${JSON.stringify(application.metadata)}::jsonb
    )
    on conflict (email) do update set
      name = excluded.name,
      zip_code = excluded.zip_code,
      smart_devices = excluded.smart_devices,
      interest_reason = excluded.interest_reason,
      referral_source = excluded.referral_source,
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
      status,
      created_at,
      updated_at
    from pilot_family_applications
    order by created_at desc
    limit 500
  `;
}
