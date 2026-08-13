import { sql } from "./db.js";
import {
  privateWaitlistPeople,
  resolvePrivateWaitlistConfig
} from "./waitlist-metrics.js";
import { isAllowedAnalyticsEventName } from "./analytics-events.js";
import { sanitizeAnalyticsProperties } from "./analytics-sanitize.js";

interface AnalyticsPayload {
  event_name?: unknown;
  eventName?: unknown;
  route?: unknown;
  path?: unknown;
  referrer?: unknown;
  form_location?: unknown;
  formLocation?: unknown;
  session_id?: unknown;
  sessionId?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  properties?: unknown;
}

let analyticsTableReady: Promise<void> | null = null;

async function initializeAnalyticsTable() {
  const db = sql();
  await db`create extension if not exists pgcrypto`;
  await db`
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
    )
  `;
  await db`alter table analytics_events add column if not exists visitor_id text`;
  await db`create index if not exists analytics_events_created_at_idx on analytics_events (created_at desc)`;
  await db`create index if not exists analytics_events_event_name_idx on analytics_events (event_name)`;
  await db`create index if not exists analytics_events_route_idx on analytics_events (route)`;
  await db`create index if not exists analytics_events_utm_source_idx on analytics_events (utm_source)`;
  await db`create index if not exists analytics_events_visitor_id_idx on analytics_events (visitor_id)`;
  await db`
    create index if not exists analytics_events_funnel_idx
      on analytics_events (route, utm_source, utm_campaign, form_location, created_at desc)
  `;
}

function ensureAnalyticsTable() {
  if (!analyticsTableReady) {
    analyticsTableReady = initializeAnalyticsTable().catch((error) => {
      analyticsTableReady = null;
      throw error;
    });
  }
  return analyticsTableReady;
}

function nullableText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function recordAnalyticsEvent(payload: AnalyticsPayload, visitorId?: string) {
  const eventName = nullableText(payload.event_name || payload.eventName, 80);
  if (!eventName || !isAllowedAnalyticsEventName(eventName)) {
    return { ignored: true };
  }

  await ensureAnalyticsTable();
  const db = sql();
  await db`
    insert into analytics_events (
      event_name,
      route,
      path,
      referrer,
      form_location,
      session_id,
      visitor_id,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      properties
    )
    values (
      ${eventName},
      ${nullableText(payload.route, 80)},
      ${nullableText(payload.path, 300)},
      ${nullableText(payload.referrer, 500)},
      ${nullableText(payload.form_location || payload.formLocation, 80)},
      ${nullableText(payload.session_id || payload.sessionId, 120)},
      ${nullableText(visitorId, 120)},
      ${nullableText(payload.utm_source, 120)},
      ${nullableText(payload.utm_medium, 120)},
      ${nullableText(payload.utm_campaign, 160)},
      ${nullableText(payload.utm_content, 160)},
      ${nullableText(payload.utm_term, 160)},
      ${JSON.stringify(sanitizeAnalyticsProperties(payload.properties))}
    )
  `;

  return { ignored: false };
}

export async function getPrivateWaitlistActivity() {
  const { baseline, startedAt } = resolvePrivateWaitlistConfig();
  const rows = (await sql()`
    select count(distinct lower(email))::int as new_waitlist_people
    from waitlist_leads
    where
      created_at >= ${startedAt}::timestamptz
      and (
        coalesce(route, '') not in ('home-v6', 'home-v7')
        or metadata->>'consent_confirmed_at' is not null
      )
  `) as unknown as Array<{ new_waitlist_people: number }>;

  return {
    waitlist_people: privateWaitlistPeople(baseline, rows[0]?.new_waitlist_people),
    updated_at: new Date().toISOString()
  };
}

function resolveRangeDays(value: unknown) {
  if (value === "all") {
    return 0;
  }
  const parsed = Number(value);
  return parsed === 30 ? 30 : 7;
}

export async function getAnalyticsDashboard(range: unknown) {
  const days = resolveRangeDays(range);
  await ensureAnalyticsTable();
  const db = sql();
  let privateWaitlist: Awaited<ReturnType<typeof getPrivateWaitlistActivity>> | null = null;
  try {
    privateWaitlist = await getPrivateWaitlistActivity();
  } catch (error) {
    console.error("Private waitlist metric is unavailable", error);
  }

  const waitlistSummaryRows = (await db`
    select
      count(distinct coalesce(nullif(visitor_id, ''), nullif(session_id, ''), id::text))
        filter (where event_name in ('page_view', 'page_view_home_v2') and coalesce(route, '') <> 'pilot-families')::int as unique_visitors,
      count(*) filter (where event_name in ('page_view', 'page_view_home_v2') and coalesce(route, '') <> 'pilot-families')::int as page_views,
      count(*) filter (where event_name in ('early_bird_start', 'waitlist_start'))::int as form_starts,
      count(*) filter (where event_name in ('early_bird_submit', 'waitlist_submit'))::int as form_submits,
      count(*) filter (where event_name in ('early_bird_saved', 'waitlist_saved'))::int as saved_leads
    from analytics_events
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
  `) as unknown as Array<{
    unique_visitors: number;
    page_views: number;
    form_starts: number;
    form_submits: number;
    saved_leads: number;
  }>;

  const pilotSummaryRows = (await db`
    select
      count(distinct coalesce(nullif(visitor_id, ''), nullif(session_id, ''), id::text))
        filter (where event_name in ('page_view', 'page_view_home_v2') and route = 'pilot-families')::int as unique_visitors,
      count(*) filter (where event_name in ('page_view', 'page_view_home_v2') and route = 'pilot-families')::int as page_views,
      count(*) filter (where event_name = 'pilot_apply_start')::int as form_starts,
      count(*) filter (where event_name = 'pilot_apply_submit')::int as form_submits,
      count(*) filter (where event_name = 'pilot_apply_saved')::int as saved_applications
    from analytics_events
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
  `) as unknown as Array<{
    unique_visitors: number;
    page_views: number;
    form_starts: number;
    form_submits: number;
    saved_applications: number;
  }>;

  const activitySummaryRows = (await db`
    select
      count(*) filter (where event_name = 'discord_click')::int as discord_clicks,
      count(*) filter (where event_name = 'compatibility_check_complete')::int as compatibility_completes,
      count(*) filter (where event_name = 'reservation_start')::int as reservation_starts
    from analytics_events
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
  `) as unknown as Array<{
    page_views: number;
    form_starts: number;
    form_submits: number;
    saved_leads: number;
    discord_clicks: number;
    compatibility_completes: number;
    reservation_starts: number;
  }>;

  const waitlistFunnelRows = (await db`
    select
      coalesce(route, 'unknown') as route,
      coalesce(nullif(utm_source, ''), 'direct') as source,
      coalesce(nullif(utm_campaign, ''), '') as campaign,
      count(distinct coalesce(nullif(visitor_id, ''), nullif(session_id, ''), id::text))
        filter (where event_name in ('page_view', 'page_view_home_v2'))::int as unique_visitors,
      count(*) filter (where event_name in ('page_view', 'page_view_home_v2'))::int as page_views,
      count(*) filter (where event_name in ('early_bird_start', 'waitlist_start'))::int as form_starts,
      count(*) filter (where event_name in ('early_bird_submit', 'waitlist_submit'))::int as form_submits,
      count(*) filter (where event_name in ('early_bird_saved', 'waitlist_saved'))::int as saved_leads
    from analytics_events
    where
      (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
      and (
        event_name in ('early_bird_start', 'waitlist_start', 'early_bird_submit', 'waitlist_submit', 'early_bird_saved', 'waitlist_saved')
        or (event_name in ('page_view', 'page_view_home_v2') and coalesce(route, '') <> 'pilot-families')
      )
    group by route, source, campaign
    order by saved_leads desc, form_submits desc, page_views desc
    limit 100
  `) as unknown as Array<Record<string, unknown>>;

  const pilotFunnelRows = (await db`
    select
      coalesce(route, 'pilot-families') as route,
      coalesce(nullif(utm_source, ''), 'direct') as source,
      coalesce(nullif(utm_campaign, ''), '') as campaign,
      count(distinct coalesce(nullif(visitor_id, ''), nullif(session_id, ''), id::text))
        filter (where event_name in ('page_view', 'page_view_home_v2'))::int as unique_visitors,
      count(*) filter (where event_name in ('page_view', 'page_view_home_v2'))::int as page_views,
      count(*) filter (where event_name = 'pilot_apply_start')::int as form_starts,
      count(*) filter (where event_name = 'pilot_apply_submit')::int as form_submits,
      count(*) filter (where event_name = 'pilot_apply_saved')::int as saved_applications
    from analytics_events
    where
      (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
      and route = 'pilot-families'
      and event_name in ('page_view', 'page_view_home_v2', 'pilot_apply_start', 'pilot_apply_submit', 'pilot_apply_saved')
    group by route, source, campaign
    order by saved_applications desc, form_submits desc, page_views desc
    limit 100
  `) as unknown as Array<Record<string, unknown>>;

  const eventRows = (await db`
    select
      event_name,
      count(*)::int as count
    from analytics_events
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by event_name
    order by count desc, event_name asc
    limit 50
  `) as unknown as Array<Record<string, unknown>>;

  const leadRows = (await db`
    select
      coalesce(nullif(primary_interest, ''), 'unknown') as primary_interest,
      count(*)::int as count
    from waitlist_leads
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by primary_interest
    order by count desc, primary_interest asc
    limit 30
  `) as unknown as Array<Record<string, unknown>>;

  const leadSummaryRows = (await db`
    select
      count(*) filter (where price_intent is not null)::int as price_profiles,
      count(*) filter (where price_intent in ('definitely', 'probably'))::int as positive_price_profiles,
      count(*) filter (where founder_reservation_status in ('paid', 'refund_pending', 'refunded'))::int as founder_reservations
    from waitlist_leads
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
  `) as unknown as Array<{
    price_profiles: number;
    positive_price_profiles: number;
    founder_reservations: number;
  }>;

  const connectionRows = (await db`
    select
      coalesce(nullif(camera_connection, ''), 'unknown') as camera_connection,
      count(*)::int as count
    from waitlist_leads
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by camera_connection
    order by count desc, camera_connection asc
    limit 20
  `) as unknown as Array<Record<string, unknown>>;

  const brandRows = (await db`
    select brand as camera_brand, count(*)::int as count
    from waitlist_leads
    cross join lateral unnest(coalesce(camera_brands, array[]::text[])) as brand
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by brand
    order by count desc, brand asc
    limit 30
  `) as unknown as Array<Record<string, unknown>>;

  const priceRows = (await db`
    select
      coalesce(nullif(price_intent, ''), 'unknown') as price_intent,
      count(*)::int as count
    from waitlist_leads
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by price_intent
    order by count desc, price_intent asc
  `) as unknown as Array<Record<string, unknown>>;

  const reservationRows = (await db`
    select
      coalesce(nullif(founder_reservation_status, ''), 'none') as reservation_status,
      count(*)::int as count
    from waitlist_leads
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by founder_reservation_status
    order by count desc, reservation_status asc
  `) as unknown as Array<Record<string, unknown>>;

  const waitlistSummary = waitlistSummaryRows[0] || {
    unique_visitors: 0,
    page_views: 0,
    form_starts: 0,
    form_submits: 0,
    saved_leads: 0
  };
  const pilotSummary = pilotSummaryRows[0] || {
    unique_visitors: 0,
    page_views: 0,
    form_starts: 0,
    form_submits: 0,
    saved_applications: 0
  };
  const activitySummary = activitySummaryRows[0] || {
    discord_clicks: 0,
    compatibility_completes: 0,
    reservation_starts: 0
  };
  const leadSummary = leadSummaryRows[0] || {
    price_profiles: 0,
    positive_price_profiles: 0,
    founder_reservations: 0
  };
  const waitlistConversionRate = waitlistSummary.unique_visitors > 0
    ? Math.round((waitlistSummary.saved_leads / waitlistSummary.unique_visitors) * 1000) / 10
    : 0;
  const pilotConversionRate = pilotSummary.unique_visitors > 0
    ? Math.round((pilotSummary.saved_applications / pilotSummary.unique_visitors) * 1000) / 10
    : 0;
  const addConversionRate = (rows: Array<Record<string, unknown>>, savedKey: string) => rows.map((row) => ({
    ...row,
    conversion_rate: Number(row.unique_visitors) > 0
      ? Math.round((Number(row[savedKey]) / Number(row.unique_visitors)) * 1000) / 10
      : 0
  }));

  return {
    range: days === 0 ? "all" : String(days),
    private_waitlist: privateWaitlist
      ? { configured: true, ...privateWaitlist }
      : { configured: false },
    summary: {
      ...waitlistSummary,
      ...activitySummary,
      ...leadSummary,
      conversion_rate: waitlistConversionRate,
      positive_price_rate:
        leadSummary.price_profiles > 0
          ? Math.round((leadSummary.positive_price_profiles / leadSummary.price_profiles) * 1000) / 10
          : 0
    },
    waitlist_summary: {
      ...waitlistSummary,
      conversion_rate: waitlistConversionRate
    },
    pilot_summary: {
      ...pilotSummary,
      conversion_rate: pilotConversionRate
    },
    funnel: addConversionRate(waitlistFunnelRows, "saved_leads"),
    waitlist_funnel: addConversionRate(waitlistFunnelRows, "saved_leads"),
    pilot_funnel: addConversionRate(pilotFunnelRows, "saved_applications"),
    events: eventRows,
    lead_interests: leadRows,
    camera_connections: connectionRows,
    camera_brands: brandRows,
    price_intents: priceRows,
    reservation_statuses: reservationRows
  };
}
