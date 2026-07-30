import { sql } from "./db.js";

export interface WaitlistPayload {
  email: string;
  route?: string;
  form_location?: string;
  path?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  primary_interest?: string;
  camera_setup?: string;
  camera_brands?: string[];
  camera_models?: string;
  camera_connection?: string;
  beta_intent?: string;
  price_intent?: string;
  purchase_blocker?: string;
  metadata?: Record<string, unknown>;
}

export interface WaitlistLead {
  id: string;
  email: string;
  route: string | null;
  form_location: string | null;
  status: string;
  notes: string | null;
  submission_count: number;
  created_at: string;
  updated_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  primary_interest: string | null;
  camera_setup: string | null;
  camera_brands: string[] | null;
  camera_models: string | null;
  camera_connection: string | null;
  beta_intent: string | null;
  price_intent: string | null;
  purchase_blocker: string | null;
  founder_reservation_status: string;
  profile_completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface WaitlistIntegrationLead {
  id: string;
  email: string;
  route: string | null;
  form_location: string | null;
  path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

const cameraConnections = new Set([
  "local_rtsp_onvif",
  "home_assistant",
  "nvr_nas",
  "vendor_cloud",
  "not_sure",
  "no_cameras"
]);
const priceIntents = new Set(["definitely", "probably", "not_sure", "no"]);
const purchaseBlockers = new Set(["compatibility", "price", "privacy", "setup", "shipping", "timing", "other"]);

function nullableText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function nullableChoice(value: unknown, allowed: Set<string>) {
  const text = nullableText(value, 80);
  return text && allowed.has(text) ? text : null;
}

function nullableTextArray(value: unknown, maxItems = 12, maxLength = 80) {
  if (!Array.isArray(value)) {
    return null;
  }
  const clean = [...new Set(value.map((entry) => nullableText(entry, maxLength)).filter(Boolean))] as string[];
  return clean.length ? clean.slice(0, maxItems) : null;
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return null;
  }
  return email;
}

export async function upsertWaitlistLead(payload: WaitlistPayload) {
  const db = sql();
  const rows = (await db`
    insert into waitlist_leads (
      email,
      route,
      form_location,
      path,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      primary_interest,
      camera_setup,
      camera_brands,
      camera_models,
      camera_connection,
      beta_intent,
      price_intent,
      purchase_blocker,
      metadata
    )
    values (
      ${payload.email},
      ${nullableText(payload.route, 80)},
      ${nullableText(payload.form_location, 80)},
      ${nullableText(payload.path, 300)},
      ${nullableText(payload.referrer, 500)},
      ${nullableText(payload.utm_source, 120)},
      ${nullableText(payload.utm_medium, 120)},
      ${nullableText(payload.utm_campaign, 160)},
      ${nullableText(payload.utm_content, 160)},
      ${nullableText(payload.utm_term, 160)},
      ${nullableText(payload.primary_interest, 80)},
      ${nullableText(payload.camera_setup, 200)},
      ${nullableTextArray(payload.camera_brands)},
      ${nullableText(payload.camera_models, 500)},
      ${nullableChoice(payload.camera_connection, cameraConnections)},
      ${nullableText(payload.beta_intent, 80)},
      ${nullableChoice(payload.price_intent, priceIntents)},
      ${nullableChoice(payload.purchase_blocker, purchaseBlockers)},
      ${JSON.stringify(payload.metadata || {})}
    )
    on conflict (email) do update set
      route = coalesce(excluded.route, waitlist_leads.route),
      form_location = coalesce(excluded.form_location, waitlist_leads.form_location),
      path = coalesce(excluded.path, waitlist_leads.path),
      referrer = coalesce(excluded.referrer, waitlist_leads.referrer),
      utm_source = coalesce(excluded.utm_source, waitlist_leads.utm_source),
      utm_medium = coalesce(excluded.utm_medium, waitlist_leads.utm_medium),
      utm_campaign = coalesce(excluded.utm_campaign, waitlist_leads.utm_campaign),
      utm_content = coalesce(excluded.utm_content, waitlist_leads.utm_content),
      utm_term = coalesce(excluded.utm_term, waitlist_leads.utm_term),
      primary_interest = coalesce(excluded.primary_interest, waitlist_leads.primary_interest),
      camera_setup = coalesce(excluded.camera_setup, waitlist_leads.camera_setup),
      camera_brands = coalesce(excluded.camera_brands, waitlist_leads.camera_brands),
      camera_models = coalesce(excluded.camera_models, waitlist_leads.camera_models),
      camera_connection = coalesce(excluded.camera_connection, waitlist_leads.camera_connection),
      beta_intent = coalesce(excluded.beta_intent, waitlist_leads.beta_intent),
      price_intent = coalesce(excluded.price_intent, waitlist_leads.price_intent),
      purchase_blocker = coalesce(excluded.purchase_blocker, waitlist_leads.purchase_blocker),
      metadata = waitlist_leads.metadata || excluded.metadata,
      submission_count = waitlist_leads.submission_count + 1,
      updated_at = now()
    returning
      id,
      email,
      route,
      form_location,
      status,
      notes,
      submission_count,
      created_at,
      updated_at,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      primary_interest,
      camera_setup,
      camera_brands,
      camera_models,
      camera_connection,
      beta_intent,
      price_intent,
      purchase_blocker,
      founder_reservation_status,
      profile_completed_at,
      metadata
  `) as unknown as WaitlistLead[];
  const [lead] = rows;
  return lead;
}

export async function listWaitlistLeads() {
  const db = sql();
  const rows = await db`
    select
      id,
      email,
      route,
      form_location,
      status,
      notes,
      submission_count,
      created_at,
      updated_at,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      primary_interest,
      camera_setup,
      camera_brands,
      camera_models,
      camera_connection,
      beta_intent,
      price_intent,
      purchase_blocker,
      founder_reservation_status,
      profile_completed_at,
      metadata
    from waitlist_leads
    order by created_at desc
    limit 300
  `;
  return rows as unknown as WaitlistLead[];
}

export async function updateWaitlistProfile(payload: WaitlistPayload) {
  const db = sql();
  const rows = (await db`
    insert into waitlist_leads (
      email,
      route,
      form_location,
      path,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      primary_interest,
      camera_setup,
      camera_brands,
      camera_models,
      camera_connection,
      beta_intent,
      price_intent,
      purchase_blocker,
      profile_completed_at,
      metadata
    )
    values (
      ${payload.email},
      ${nullableText(payload.route, 80)},
      ${nullableText(payload.form_location, 80)},
      ${nullableText(payload.path, 300)},
      ${nullableText(payload.referrer, 500)},
      ${nullableText(payload.utm_source, 120)},
      ${nullableText(payload.utm_medium, 120)},
      ${nullableText(payload.utm_campaign, 160)},
      ${nullableText(payload.utm_content, 160)},
      ${nullableText(payload.utm_term, 160)},
      ${nullableText(payload.primary_interest, 80)},
      ${nullableText(payload.camera_setup, 200)},
      ${nullableTextArray(payload.camera_brands)},
      ${nullableText(payload.camera_models, 500)},
      ${nullableChoice(payload.camera_connection, cameraConnections)},
      ${nullableText(payload.beta_intent, 80)},
      ${nullableChoice(payload.price_intent, priceIntents)},
      ${nullableChoice(payload.purchase_blocker, purchaseBlockers)},
      now(),
      ${JSON.stringify(payload.metadata || {})}
    )
    on conflict (email) do update set
      primary_interest = coalesce(excluded.primary_interest, waitlist_leads.primary_interest),
      camera_setup = coalesce(excluded.camera_setup, waitlist_leads.camera_setup),
      camera_brands = coalesce(excluded.camera_brands, waitlist_leads.camera_brands),
      camera_models = coalesce(excluded.camera_models, waitlist_leads.camera_models),
      camera_connection = coalesce(excluded.camera_connection, waitlist_leads.camera_connection),
      beta_intent = coalesce(excluded.beta_intent, waitlist_leads.beta_intent),
      price_intent = coalesce(excluded.price_intent, waitlist_leads.price_intent),
      purchase_blocker = coalesce(excluded.purchase_blocker, waitlist_leads.purchase_blocker),
      profile_completed_at = now(),
      metadata = waitlist_leads.metadata || excluded.metadata,
      updated_at = now()
    returning
      id,
      email,
      route,
      form_location,
      status,
      notes,
      submission_count,
      created_at,
      updated_at,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      primary_interest,
      camera_setup,
      camera_brands,
      camera_models,
      camera_connection,
      beta_intent,
      price_intent,
      purchase_blocker,
      founder_reservation_status,
      profile_completed_at,
      metadata
  `) as unknown as WaitlistLead[];
  const [lead] = rows;
  return lead;
}

export function waitlistIntegrationState(lead: Pick<WaitlistIntegrationLead, "metadata">) {
  const metadata = lead.metadata && typeof lead.metadata === "object" ? lead.metadata : {};
  const text = (key: string) => typeof metadata[key] === "string" ? metadata[key] as string : null;
  const count = (key: string) => {
    const value = Number(metadata[key]);
    return Number.isFinite(value) ? value : 0;
  };

  return {
    consent_scope: text("consent_scope"),
    consent_version: text("consent_version"),
    consent_requested_at: text("consent_requested_at"),
    consent_confirmed_at: text("consent_confirmed_at"),
    confirmation_email_status: text("confirmation_email_status") || "not_requested",
    confirmation_email_attempt_count: count("confirmation_email_attempt_count"),
    contact_sync_status: text("contact_sync_status") || "not_requested",
    contact_sync_attempt_count: count("contact_sync_attempt_count"),
    operator_notification_status: text("operator_notification_status") || "not_requested",
    operator_notification_attempt_count: count("operator_notification_attempt_count")
  };
}

export async function prepareWaitlistConsent(
  leadId: string,
  consentScope: string,
  consentVersion: string,
  requestedAt: string
) {
  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'consent_scope', ${consentScope}::text,
        'consent_version', ${consentVersion}::text,
        'consent_requested_at', case
          when metadata->>'consent_version' = ${consentVersion}
            and (
              metadata->>'consent_confirmed_at' is not null
              or nullif(metadata->>'confirmation_email_sent_at', '')::timestamptz > now() - interval '24 hours'
              or (
                metadata->>'confirmation_email_status' = 'sending'
                and nullif(metadata->>'confirmation_email_attempted_at', '')::timestamptz > now() - interval '5 minutes'
              )
            )
          then coalesce(metadata->>'consent_requested_at', ${requestedAt}::text)
          else ${requestedAt}::text
        end,
        'consent_status', case
          when metadata->>'consent_version' = ${consentVersion}
            and metadata->>'consent_confirmed_at' is not null
          then 'confirmed'
          else 'pending_confirmation'
        end,
        'confirmation_email_status', case
          when metadata->>'consent_version' = ${consentVersion}
            and metadata->>'consent_confirmed_at' is not null
          then 'sent'
          when metadata->>'consent_version' = ${consentVersion}
            and nullif(metadata->>'confirmation_email_sent_at', '')::timestamptz > now() - interval '24 hours'
          then 'sent'
          when metadata->>'consent_version' = ${consentVersion}
            and metadata->>'confirmation_email_status' = 'sending'
            and nullif(metadata->>'confirmation_email_attempted_at', '')::timestamptz > now() - interval '5 minutes'
          then 'sending'
          else 'pending'
        end
      ),
      updated_at = now()
    where id = ${leadId}
    returning id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
  `) as unknown as WaitlistIntegrationLead[];
  return rows[0] || null;
}

export async function claimConfirmationEmail(leadId: string) {
  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'confirmation_email_status', 'sending',
        'confirmation_email_attempted_at', now()::text,
        'confirmation_email_attempt_count', coalesce((metadata->>'confirmation_email_attempt_count')::int, 0) + 1,
        'confirmation_email_error', null
      ),
      updated_at = now()
    where id = ${leadId}
      and metadata->>'consent_confirmed_at' is null
      and coalesce((metadata->>'confirmation_email_attempt_count')::int, 0) < 5
      and (
        metadata->>'confirmation_email_status' in ('pending', 'failed')
        or (
          metadata->>'confirmation_email_status' = 'sending'
          and nullif(metadata->>'confirmation_email_attempted_at', '')::timestamptz <= now() - interval '5 minutes'
        )
      )
    returning id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
  `) as unknown as WaitlistIntegrationLead[];
  return rows[0] || null;
}

export async function markConfirmationEmailSent(leadId: string, providerId: string | null) {
  const db = sql();
  await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'confirmation_email_status', 'sent',
        'confirmation_email_sent_at', now()::text,
        'confirmation_email_provider_id', ${providerId}::text,
        'confirmation_email_error', null
      ),
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function markConfirmationEmailFailed(leadId: string, error: string) {
  const db = sql();
  await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'confirmation_email_status', 'failed',
        'confirmation_email_error', ${error.slice(0, 500)}::text
      ),
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function confirmWaitlistConsent(email: string, consentVersion: string) {
  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'consent_status', 'confirmed',
        'consent_confirmed_at', coalesce(metadata->>'consent_confirmed_at', now()::text),
        'confirmation_email_status', 'sent',
        'contact_sync_status', case
          when metadata->>'contact_sync_status' = 'synced' then 'synced'
          when metadata->>'contact_sync_status' = 'sending'
            and nullif(metadata->>'contact_sync_attempted_at', '')::timestamptz > now() - interval '5 minutes'
          then 'sending'
          else 'pending'
        end,
        'contact_sync_error', null
      ),
      updated_at = now()
    where email = ${email}
      and metadata->>'consent_scope' = 'kickstarter_updates'
      and metadata->>'consent_version' = ${consentVersion}
    returning id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
  `) as unknown as WaitlistIntegrationLead[];
  return rows[0] || null;
}

export async function claimContactSync(leadId: string) {
  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'contact_sync_status', 'sending',
        'contact_sync_attempted_at', now()::text,
        'contact_sync_attempt_count', coalesce((metadata->>'contact_sync_attempt_count')::int, 0) + 1,
        'contact_sync_error', null
      ),
      updated_at = now()
    where id = ${leadId}
      and metadata->>'consent_confirmed_at' is not null
      and coalesce((metadata->>'contact_sync_attempt_count')::int, 0) < 10
      and (
        metadata->>'contact_sync_status' in ('pending', 'failed')
        or (
          metadata->>'contact_sync_status' = 'sending'
          and nullif(metadata->>'contact_sync_attempted_at', '')::timestamptz <= now() - interval '5 minutes'
        )
      )
    returning id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
  `) as unknown as WaitlistIntegrationLead[];
  return rows[0] || null;
}

export async function markContactSynced(leadId: string, topicId: string | null) {
  const db = sql();
  await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'contact_sync_status', 'synced',
        'contact_synced_at', now()::text,
        'contact_sync_topic_id', ${topicId}::text,
        'contact_sync_error', null
      ),
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function markContactSyncFailed(leadId: string, error: string) {
  const db = sql();
  await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'contact_sync_status', 'failed',
        'contact_sync_error', ${error.slice(0, 500)}::text
      ),
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function prepareOperatorNotification(leadId: string) {
  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'operator_notification_status', case
          when metadata->>'operator_notification_status' = 'sent' then 'sent'
          when metadata->>'operator_notification_status' = 'sending'
            and nullif(metadata->>'operator_notification_attempted_at', '')::timestamptz > now() - interval '5 minutes'
          then 'sending'
          else 'pending'
        end
      ),
      updated_at = now()
    where id = ${leadId}
    returning id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
  `) as unknown as WaitlistIntegrationLead[];
  return rows[0] || null;
}

export async function claimOperatorNotification(leadId: string) {
  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'operator_notification_status', 'sending',
        'operator_notification_attempted_at', now()::text,
        'operator_notification_attempt_count', coalesce((metadata->>'operator_notification_attempt_count')::int, 0) + 1,
        'operator_notification_error', null
      ),
      updated_at = now()
    where id = ${leadId}
      and coalesce((metadata->>'operator_notification_attempt_count')::int, 0) < 10
      and (
        metadata->>'operator_notification_status' in ('pending', 'failed')
        or (
          metadata->>'operator_notification_status' = 'sending'
          and nullif(metadata->>'operator_notification_attempted_at', '')::timestamptz <= now() - interval '5 minutes'
        )
      )
    returning id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
  `) as unknown as WaitlistIntegrationLead[];
  return rows[0] || null;
}

export async function markOperatorNotificationSent(leadId: string) {
  const db = sql();
  await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'operator_notification_status', 'sent',
        'operator_notification_sent_at', now()::text,
        'operator_notification_error', null
      ),
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function markOperatorNotificationFailed(leadId: string, error: string) {
  const db = sql();
  await db`
    update waitlist_leads
    set
      metadata = metadata || jsonb_build_object(
        'operator_notification_status', 'failed',
        'operator_notification_error', ${error.slice(0, 500)}::text
      ),
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function listRetryableWaitlistIntegrations(limit = 50) {
  const db = sql();
  const rows = await db`
    select id, email, route, form_location, path, referrer, utm_source, utm_campaign, created_at, metadata
    from waitlist_leads
    where
      (
        metadata->>'consent_confirmed_at' is null
        and coalesce((metadata->>'confirmation_email_attempt_count')::int, 0) < 5
        and (
          metadata->>'confirmation_email_status' in ('pending', 'failed')
          or (
            metadata->>'confirmation_email_status' = 'sending'
            and nullif(metadata->>'confirmation_email_attempted_at', '')::timestamptz <= now() - interval '5 minutes'
          )
        )
      )
      or (
        metadata->>'consent_confirmed_at' is not null
        and coalesce((metadata->>'contact_sync_attempt_count')::int, 0) < 10
        and (
          metadata->>'contact_sync_status' in ('pending', 'failed')
          or (
            metadata->>'contact_sync_status' = 'sending'
            and nullif(metadata->>'contact_sync_attempted_at', '')::timestamptz <= now() - interval '5 minutes'
          )
        )
      )
      or (
        (coalesce(route, '') not in ('home-v6', 'home-v7') or metadata->>'consent_confirmed_at' is not null)
        and coalesce((metadata->>'operator_notification_attempt_count')::int, 0) < 10
        and (
          metadata->>'operator_notification_status' in ('pending', 'failed')
          or (
            metadata->>'operator_notification_status' = 'sending'
            and nullif(metadata->>'operator_notification_attempted_at', '')::timestamptz <= now() - interval '5 minutes'
          )
        )
      )
    order by updated_at asc
    limit ${Math.max(1, Math.min(limit, 100))}
  `;
  return rows as unknown as WaitlistIntegrationLead[];
}

export async function purgeExpiredUnconfirmedWaitlistLeads(retentionDays = 30) {
  const db = sql();
  const rows = await db`
    delete from waitlist_leads
    where route in ('home-v6', 'home-v7')
      and founder_reservation_status = 'none'
      and metadata->>'consent_confirmed_at' is null
      and nullif(metadata->>'consent_requested_at', '')::timestamptz < now() - (${retentionDays} * interval '1 day')
    returning id
  `;
  return rows.length;
}

export async function getWaitlistHealth() {
  const db = sql();
  const tableRows = (await db`
    select
      to_regclass('public.waitlist_leads') as waitlist_table,
      to_regclass('public.analytics_events') as analytics_table,
      to_regclass('public.founder_reservations') as reservations_table
  `) as unknown as Array<{
    waitlist_table: string | null;
    analytics_table: string | null;
    reservations_table: string | null;
  }>;
  const tableReady = Boolean(tableRows[0]?.waitlist_table);
  const analyticsTableReady = Boolean(tableRows[0]?.analytics_table);
  const reservationsTableReady = Boolean(tableRows[0]?.reservations_table);
  let leadCount: number | null = null;
  let reservationCount: number | null = null;
  let emailServices = {
    pending_confirmations: 0,
    failed_confirmations: 0,
    pending_contact_syncs: 0,
    failed_contact_syncs: 0,
    failed_operator_notifications: 0
  };

  if (tableReady) {
    const countRows = (await db`
      select
        count(*)::int as count,
        count(*) filter (where metadata->>'confirmation_email_status' in ('pending', 'sending'))::int as pending_confirmations,
        count(*) filter (where metadata->>'confirmation_email_status' = 'failed')::int as failed_confirmations,
        count(*) filter (where metadata->>'contact_sync_status' in ('pending', 'sending'))::int as pending_contact_syncs,
        count(*) filter (where metadata->>'contact_sync_status' = 'failed')::int as failed_contact_syncs,
        count(*) filter (where metadata->>'operator_notification_status' = 'failed')::int as failed_operator_notifications
      from waitlist_leads
    `) as unknown as Array<typeof emailServices & { count: number }>;
    leadCount = countRows[0]?.count ?? 0;
    emailServices = {
      pending_confirmations: countRows[0]?.pending_confirmations ?? 0,
      failed_confirmations: countRows[0]?.failed_confirmations ?? 0,
      pending_contact_syncs: countRows[0]?.pending_contact_syncs ?? 0,
      failed_contact_syncs: countRows[0]?.failed_contact_syncs ?? 0,
      failed_operator_notifications: countRows[0]?.failed_operator_notifications ?? 0
    };
  }

  if (reservationsTableReady) {
    const countRows = (await db`
      select count(*)::int as count from founder_reservations
    `) as unknown as Array<{ count: number }>;
    reservationCount = countRows[0]?.count ?? 0;
  }

  return {
    connected: true,
    table_ready: tableReady,
    analytics_table_ready: analyticsTableReady,
    reservations_table_ready: reservationsTableReady,
    lead_count: leadCount,
    reservation_count: reservationCount,
    email_services: emailServices
  };
}

export async function updateWaitlistLead(id: unknown, status: unknown, notes: unknown) {
  const leadId = nullableText(id, 80);
  const nextStatus = nullableText(status, 40) || "new";
  const nextNotes = nullableText(notes, 2000);
  if (!leadId) {
    throw new Error("Missing lead id");
  }

  const db = sql();
  const rows = (await db`
    update waitlist_leads
    set status = ${nextStatus}, notes = ${nextNotes}, updated_at = now()
    where id = ${leadId}
    returning
      id,
      email,
      route,
      form_location,
      status,
      notes,
      submission_count,
      created_at,
      updated_at,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      primary_interest,
      camera_setup,
      camera_brands,
      camera_models,
      camera_connection,
      beta_intent,
      price_intent,
      purchase_blocker,
      founder_reservation_status,
      profile_completed_at,
      metadata
  `) as unknown as WaitlistLead[];
  const [lead] = rows;
  return lead;
}
