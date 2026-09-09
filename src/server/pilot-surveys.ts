import { sql } from "./db.js";
import { validatePilotSurvey, type PilotSurveyInput } from "./pilot-survey-validation.js";

let pilotSurveyTableReady: Promise<void> | null = null;

async function initializePilotSurveyTable() {
  const db = sql();
  await db`create extension if not exists pgcrypto`;
  await db`
    create table if not exists pilot_family_surveys (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null unique,
      adult_confirmed boolean not null,
      stable_wifi_confirmed boolean not null,
      compatible_device_confirmed boolean not null,
      pilot_commitment_confirmed boolean not null,
      selection_acknowledged boolean not null,
      on_camera_willingness text not null,
      filming_ability text not null,
      audience_level text not null,
      story_sample text not null,
      core_scenarios jsonb not null default '[]'::jsonb,
      household_context jsonb not null default '[]'::jsonb,
      device_categories jsonb not null default '[]'::jsonb,
      available_windows jsonb not null default '[]'::jsonb,
      scheduling_confidence text not null,
      completion_commitment text not null,
      past_participation_level text not null,
      referral_source text not null,
      accuracy_confirmed boolean not null,
      review_contact_confirmed boolean not null,
      disclosure_confirmed boolean not null,
      no_marketing_acknowledged boolean not null,
      content_score integer not null,
      scenario_score integer not null,
      reliability_score integer not null,
      total_score integer not null,
      score_band text not null,
      score_version text not null,
      automatic_summary text not null,
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
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint pilot_family_surveys_total_score_check check (total_score between 0 and 100),
      constraint pilot_family_surveys_score_band_check check (score_band in ('priority', 'qualified', 'conditional', 'not_priority'))
    )
  `;
  await db`create index if not exists pilot_family_surveys_score_idx on pilot_family_surveys (total_score desc, created_at desc)`;
  await db`create index if not exists pilot_family_surveys_band_idx on pilot_family_surveys (score_band, created_at desc)`;
}

function ensurePilotSurveyTable() {
  if (!pilotSurveyTableReady) {
    pilotSurveyTableReady = initializePilotSurveyTable().catch((error) => {
      pilotSurveyTableReady = null;
      throw error;
    });
  }
  return pilotSurveyTableReady;
}

export async function savePilotSurvey(input: PilotSurveyInput) {
  const validated = validatePilotSurvey(input);
  if ("error" in validated) return validated;
  await ensurePilotSurveyTable();
  const application = validated.application;
  const score = validated.score;
  const rows = await sql()`
    insert into pilot_family_surveys (
      name, email,
      adult_confirmed, stable_wifi_confirmed, compatible_device_confirmed,
      pilot_commitment_confirmed, selection_acknowledged,
      on_camera_willingness, filming_ability, audience_level, story_sample,
      core_scenarios, household_context, device_categories, available_windows,
      scheduling_confidence, completion_commitment, past_participation_level, referral_source,
      accuracy_confirmed, review_contact_confirmed, disclosure_confirmed, no_marketing_acknowledged,
      content_score, scenario_score, reliability_score, total_score,
      score_band, score_version, automatic_summary,
      route, path, referrer, session_id, visitor_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      metadata
    ) values (
      ${application.name}, ${application.email},
      ${application.adult_confirmed}, ${application.stable_wifi_confirmed}, ${application.compatible_device_confirmed},
      ${application.pilot_commitment_confirmed}, ${application.selection_acknowledged},
      ${application.on_camera_willingness}, ${application.filming_ability}, ${application.audience_level}, ${application.story_sample},
      ${JSON.stringify(application.core_scenarios)}::jsonb,
      ${JSON.stringify(application.household_context)}::jsonb,
      ${JSON.stringify(application.device_categories)}::jsonb,
      ${JSON.stringify(application.available_windows)}::jsonb,
      ${application.scheduling_confidence}, ${application.completion_commitment},
      ${application.past_participation_level}, ${application.referral_source},
      ${application.accuracy_confirmed}, ${application.review_contact_confirmed},
      ${application.disclosure_confirmed}, ${application.no_marketing_acknowledged},
      ${score.content_score}, ${score.scenario_score}, ${score.reliability_score}, ${score.total_score},
      ${score.score_band}, ${score.score_version}, ${score.automatic_summary},
      ${application.route || null}, ${application.path || null}, ${application.referrer || null},
      ${application.session_id || null}, ${application.visitor_id || null},
      ${application.utm_source || null}, ${application.utm_medium || null}, ${application.utm_campaign || null},
      ${application.utm_content || null}, ${application.utm_term || null},
      ${JSON.stringify(application.metadata)}::jsonb
    )
    on conflict (email) do update set
      name = excluded.name,
      adult_confirmed = excluded.adult_confirmed,
      stable_wifi_confirmed = excluded.stable_wifi_confirmed,
      compatible_device_confirmed = excluded.compatible_device_confirmed,
      pilot_commitment_confirmed = excluded.pilot_commitment_confirmed,
      selection_acknowledged = excluded.selection_acknowledged,
      on_camera_willingness = excluded.on_camera_willingness,
      filming_ability = excluded.filming_ability,
      audience_level = excluded.audience_level,
      story_sample = excluded.story_sample,
      core_scenarios = excluded.core_scenarios,
      household_context = excluded.household_context,
      device_categories = excluded.device_categories,
      available_windows = excluded.available_windows,
      scheduling_confidence = excluded.scheduling_confidence,
      completion_commitment = excluded.completion_commitment,
      past_participation_level = excluded.past_participation_level,
      referral_source = excluded.referral_source,
      accuracy_confirmed = excluded.accuracy_confirmed,
      review_contact_confirmed = excluded.review_contact_confirmed,
      disclosure_confirmed = excluded.disclosure_confirmed,
      no_marketing_acknowledged = excluded.no_marketing_acknowledged,
      content_score = excluded.content_score,
      scenario_score = excluded.scenario_score,
      reliability_score = excluded.reliability_score,
      total_score = excluded.total_score,
      score_band = excluded.score_band,
      score_version = excluded.score_version,
      automatic_summary = excluded.automatic_summary,
      route = coalesce(excluded.route, pilot_family_surveys.route),
      path = coalesce(excluded.path, pilot_family_surveys.path),
      referrer = coalesce(excluded.referrer, pilot_family_surveys.referrer),
      session_id = coalesce(excluded.session_id, pilot_family_surveys.session_id),
      visitor_id = coalesce(excluded.visitor_id, pilot_family_surveys.visitor_id),
      utm_source = coalesce(excluded.utm_source, pilot_family_surveys.utm_source),
      utm_medium = coalesce(excluded.utm_medium, pilot_family_surveys.utm_medium),
      utm_campaign = coalesce(excluded.utm_campaign, pilot_family_surveys.utm_campaign),
      utm_content = coalesce(excluded.utm_content, pilot_family_surveys.utm_content),
      utm_term = coalesce(excluded.utm_term, pilot_family_surveys.utm_term),
      metadata = pilot_family_surveys.metadata || excluded.metadata,
      updated_at = now()
    returning id, email, total_score, score_band, score_version, created_at, updated_at
  `;
  return { survey: rows[0] } as const;
}

export async function listPilotSurveys() {
  await ensurePilotSurveyTable();
  return sql()`
    select
      id, name, email,
      adult_confirmed, stable_wifi_confirmed, compatible_device_confirmed,
      pilot_commitment_confirmed, selection_acknowledged,
      on_camera_willingness, filming_ability, audience_level, story_sample,
      core_scenarios, household_context, device_categories, available_windows,
      scheduling_confidence, completion_commitment, past_participation_level, referral_source,
      accuracy_confirmed, review_contact_confirmed, disclosure_confirmed, no_marketing_acknowledged,
      content_score, scenario_score, reliability_score, total_score,
      score_band, score_version, automatic_summary,
      route, path, referrer, session_id, visitor_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      created_at, updated_at
    from pilot_family_surveys
    order by total_score desc, created_at desc
    limit 1000
  `;
}
