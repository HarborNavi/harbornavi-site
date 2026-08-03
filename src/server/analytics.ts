import { sql } from "./db.js";
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

function nullableText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function recordAnalyticsEvent(payload: AnalyticsPayload) {
  const eventName = nullableText(payload.event_name || payload.eventName, 80);
  if (!eventName || !isAllowedAnalyticsEventName(eventName)) {
    return { ignored: true };
  }

  const db = sql();
  await db`
    insert into analytics_events (
      event_name,
      route,
      path,
      referrer,
      form_location,
      session_id,
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

export async function getPublicWaitlistActivity() {
  const rows = (await sql()`
    select count(distinct lower(email))::int as waitlist_people
    from waitlist_leads
    where
      coalesce(route, '') not in ('home-v6', 'home-v7')
      or metadata->>'consent_confirmed_at' is not null
  `) as unknown as Array<{ waitlist_people: number }>;

  return {
    waitlist_people: Number(rows[0]?.waitlist_people || 0),
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
  const db = sql();

  const summaryRows = (await db`
    select
      count(*) filter (where event_name in ('page_view', 'page_view_home_v2'))::int as page_views,
      count(*) filter (where event_name in ('early_bird_start', 'waitlist_start'))::int as form_starts,
      count(*) filter (where event_name in ('early_bird_submit', 'waitlist_submit'))::int as form_submits,
      count(*) filter (where event_name in ('early_bird_saved', 'waitlist_saved'))::int as saved_leads,
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

  const funnelRows = (await db`
    select
      coalesce(route, 'unknown') as route,
      coalesce(nullif(utm_source, ''), 'direct') as source,
      coalesce(nullif(utm_campaign, ''), '') as campaign,
      coalesce(nullif(form_location, ''), '') as form_location,
      count(*) filter (where event_name in ('page_view', 'page_view_home_v2'))::int as page_views,
      count(*) filter (where event_name in ('early_bird_start', 'waitlist_start'))::int as form_starts,
      count(*) filter (where event_name in ('early_bird_submit', 'waitlist_submit'))::int as form_submits,
      count(*) filter (where event_name in ('early_bird_saved', 'waitlist_saved'))::int as saved_leads,
      count(*) filter (where event_name = 'discord_click')::int as discord_clicks
    from analytics_events
    where (${days}::int = 0 or created_at >= now() - (${days}::int * interval '1 day'))
    group by route, source, campaign, form_location
    order by saved_leads desc, form_submits desc, page_views desc
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

  const summary = summaryRows[0] || {
    page_views: 0,
    form_starts: 0,
    form_submits: 0,
    saved_leads: 0,
    discord_clicks: 0,
    compatibility_completes: 0,
    reservation_starts: 0
  };
  const leadSummary = leadSummaryRows[0] || {
    price_profiles: 0,
    positive_price_profiles: 0,
    founder_reservations: 0
  };

  return {
    range: days === 0 ? "all" : String(days),
    summary: {
      ...summary,
      ...leadSummary,
      conversion_rate:
        summary.page_views > 0 ? Math.round((summary.saved_leads / summary.page_views) * 1000) / 10 : 0,
      positive_price_rate:
        leadSummary.price_profiles > 0
          ? Math.round((leadSummary.positive_price_profiles / leadSummary.price_profiles) * 1000) / 10
          : 0
    },
    funnel: funnelRows,
    events: eventRows,
    lead_interests: leadRows,
    camera_connections: connectionRows,
    camera_brands: brandRows,
    price_intents: priceRows,
    reservation_statuses: reservationRows
  };
}
