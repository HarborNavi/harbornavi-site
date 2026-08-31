# HarborNavi Waitlist Backend

Status: V9 production baseline with retained V6 through V8 versions

## Shape

- Public pages: `/home-v6`, `/home-v7`, `/home-v8`, `/home-v9`, `/pilot-families`, `/15-homes`, `/15-homes/thanks`, `/privacy`, plus retained comparison routes
- Entry redirects: `/` and `/home` permanently redirect to `/home-v9`
- Archived pages: `/home-v4` and `/home-v5` are `noindex` references with inactive forms
- Submit API: `/api/waitlist`
- Pilot application API: `/api/pilot-application`
- Legacy confirmation API: `/api/waitlist/confirm`
- Optional profile API: `/api/waitlist/profile`
- Event API: `/api/events`
- Admin pages: retained `/admin` baseline and campaign dashboard `/admin666`
- Admin APIs: `/api/admin/login`, `/api/admin/health`, `/api/admin/leads`, `/api/admin/pilot-applications`, `/api/admin/update-lead`, `/api/admin/analytics`
- Media API: `/api/assets` (public active-hero delivery plus authenticated upload, activation, and deletion)
- Reservation APIs: `/api/reservations/status`, `/api/reservations/checkout`, `/api/reservations/session`
- Stripe webhook and refund worker: `/api/stripe/webhook`, `/api/cron/refund-reservations`
- Waitlist retry worker: `/api/cron/retry-waitlist`, called hourly by GitHub Actions with a daily Vercel Cron fallback
- Database: Neon Postgres tables `waitlist_leads`, `analytics_events`, `founder_reservations`, `site_media`, and `pilot_family_applications`
- Media storage: public Vercel Blob store with Neon `site_media` metadata
- Operator notification: Resend Email API
- Marketing-contact sync: Resend Contacts with one Kickstarter Topic

The public site remains static. Vercel serves API functions from the same project, so no extra backend server is required.
The campaign functions also initialize `site_media` and `pilot_family_applications` idempotently on first use; the SQL files remain available for pre-deploy migration and audit.

Production and Preview are intentionally isolated. Vercel Production uses the Neon `main` branch; Vercel Preview uses
the schema-only Neon `preview` branch. Do not point Preview back to the production connection string. Schema changes must
be applied to both branches before an API change is merged, while Preview smoke data must be removed after testing.

## Environment Variables

Required for waitlist persistence:

```text
DATABASE_URL
```

Required only for the admin dashboard:

```text
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

Connect a public Vercel Blob store to the project for `/admin666` media uploads. Vercel injects `BLOB_STORE_ID` and a short-lived OIDC token at runtime, so no manually managed Blob token is required in Production or Preview. `BLOB_READ_WRITE_TOKEN` remains an optional fallback for local or non-Vercel development.

Required for contact sync and retry processing:

```text
RESEND_API_KEY
CRON_SECRET
```

`WAITLIST_CONFIRMATION_SECRET` and `WAITLIST_CONFIRMATION_FROM_EMAIL` are retained only for confirmation links issued
before immediate enrollment was enabled. New submissions do not use them. The sender in `NOTIFY_FROM_EMAIL` must be
accepted by the configured Resend account.

The `CRON_SECRET` value must match in Vercel Production/Preview and the GitHub repository Actions secret. Rotate all
copies together; never put the value in source, workflow logs, or handoff notes.

The operator alert also needs both values below. Publish `waitlist@harbornavi.com` for deletion requests.

```text
NOTIFY_TO_EMAIL
NOTIFY_FROM_EMAIL
```

Optional overrides:

```text
WAITLIST_PUBLIC_ORIGIN
RESEND_KICKSTARTER_TOPIC_ID
RESEND_KICKSTARTER_TOPIC_NAME
```

`WAITLIST_PUBLIC_ORIGIN` defaults to `https://harbornavi.com` for the retry worker. If
`RESEND_KICKSTARTER_TOPIC_ID` is empty, the retry worker finds or creates a Topic named
`HarborNavi Kickstarter Updates` in Production and `HarborNavi Preview Kickstarter Updates` outside Production.
The Topic must use `default_subscription=opt_out`; submitted contacts are explicitly synced as `opt_in`. The optional
name override is useful for isolated test resources. There is no separate Road Topic dependency.

Public, build-time campaign configuration:

```text
PUBLIC_ROAD_HOMES_FORM_URL
PUBLIC_ROAD_HOMES_PRIVACY_READY
PUBLIC_KICKSTARTER_PRELAUNCH_URL
PUBLIC_YOUTUBE_CHANNEL_URL
PUBLIC_YOUTUBE_PLAYLIST_URL
PUBLIC_CAMPAIGN_PHASE
```

Leave public URLs empty until the official destination exists. The pages render an unavailable state rather than a
placeholder link. A valid application URL remains disabled unless `PUBLIC_ROAD_HOMES_PRIVACY_READY=true`. Set that flag
only after the application provider name, retention window, deletion-request contact, and applicant rights are published
on the privacy surface and reviewed for launch. Supported phases are `before_prelaunch`, `prelaunch_live`, `road_live`,
and `replay`.

Optional and configuration-gated for Founder priority reservations:

```text
FOUNDER_RESERVATION_ENABLED
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FOUNDER_RESERVATION_REFUND_AT
```

Keep `FOUNDER_RESERVATION_ENABLED=false` until checkout, signed webhook delivery, the Neon reservation table, and the automatic refund worker have all passed Stripe test mode. `FOUNDER_RESERVATION_REFUND_AT` must be set to the actual Kickstarter launch time; the daily Vercel cron starts refunds at or after that timestamp.

No additional analytics account or environment variable is required. The admin password is sent only to `/api/admin/login` over HTTPS; the browser receives an 8-hour signed token stored in `sessionStorage`.

## Database Setup

Run the base SQL files in Neon:

```sql
-- db/waitlist.sql
-- db/analytics.sql
-- db/media.sql
-- db/pilot-families.sql
```

For an existing database, also run the idempotent migration:

```sql
-- db/growth-v4.sql
```

`db/waitlist.sql` is idempotent and also adds the v1 profile columns:

- `primary_interest`
- `camera_setup`
- `beta_intent`
- `profile_completed_at`

The v4 migration adds:

- `camera_brands text[]`, `camera_models`, and `camera_connection`
- `price_intent` and `purchase_blocker`
- `founder_reservation_status`
- `founder_reservations`, which holds Stripe object IDs and refund lifecycle timestamps separately from public lead data

`db/analytics.sql` creates first-party event storage with route, path, referrer, form location, session and anonymous visitor IDs, UTM fields, JSON properties, and timestamp indexes. The server runs the same idempotent table/column initialization before recording or reporting events, so an existing database receives the `visitor_id` column automatically.

`db/pilot-families.sql` creates a separate application table for the six Pilot Families questions plus route, referrer, anonymous visitor/session IDs, and UTM attribution. The public form posts to `/api/pilot-application`, which validates and upserts by normalized email. It does not create waitlist consent, send confirmation email, or sync the applicant to the Kickstarter marketing Topic.

## Waitlist Flow

`/api/waitlist` validates email, ignores honeypot submissions, upserts the lead by email, and increments
`submission_count`. Only normalized routes from `home-v6` through `home-v9` start marketing consent. V4, V5, and unknown routes have scope
`none` and cannot enter the marketing Topic.

For V6 through V9, the server writes its own route-specific consent metadata after the primary save; it never accepts these values from
the browser:

- `consent_scope=kickstarter_updates`
- `consent_version=home_v6_2026_07`, `home_v7_2026_07`, `home_v8_2026_08`, or `home_v9_2026_08`
- `consent_requested_at=<server ISO timestamp>`
- `consent_confirmed_at=<same server ISO timestamp>`
- `consent_status=confirmed`
- `confirmation_email_status=not_required`

The database save immediately enrolls the address. The API then starts Resend Contact sync and the operator alert, but
provider failures do not change the successful response or require another submission. The Contact adapter resolves one
Kickstarter Topic, creates or updates the contact, and explicitly sets the Topic subscription to `opt_in`. The legacy
`GET /api/waitlist/confirm` route remains available only for links issued before this change.

Operational state lives in `waitlist_leads.metadata`, including:

- `confirmation_email_status=not_required` for new submissions
- `contact_sync_status`, attempt count, timestamps, Topic ID, and last error
- `operator_notification_status`, attempt count, timestamps, and last error

The authenticated `/api/cron/retry-waitlist` worker resolves or creates the Kickstarter Topic and processes eligible
contact/operator failures in bounded batches. GitHub Actions calls it hourly; Vercel Cron calls it daily as a
Hobby-plan-compatible fallback. A lead remains in Neon until a deletion request is handled.

### Resend Broadcast operating rule

The site synchronizes consent and topic membership; it deliberately does not auto-send marketing mail. Campaign sends
remain a reviewed operator action in Resend Broadcasts:

1. Use the single Kickstarter Topic resolved by the application. Its optional ID override is
   `RESEND_KICKSTARTER_TOPIC_ID`; do not attach the waitlist audience to a Road Topic.
2. Draft every Kickstarter marketing send as a Broadcast and associate it with that Topic.
3. Include Resend's unsubscribe footer or `{{{RESEND_UNSUBSCRIBE_URL}}}`. Never send campaign marketing through the
   transactional Email API to bypass a global or Topic-level unsubscribe.
4. Send a test to the internal review list, then verify sender domain, reply-to, subject, mobile layout, every link,
   UTM values, Topic, Segment, and suppression behavior. A named operator gives the final send/schedule approval.
5. After sending, record Broadcast ID, Topic, Segment, audience count, delivered, clicks, unsubscribes and the linked
   campaign milestone. Open rate is contextual only and does not replace attributable follower or application metrics.

Resend's current Topic model applies preferences to Broadcasts and exposes Topic-level or global unsubscribe choices;
its Broadcast editor/API handles reviewed drafts, tests and sends. See
<https://resend.com/docs/dashboard/topics/introduction> and
<https://resend.com/docs/dashboard/broadcasts/introduction>.

`/api/waitlist/profile` is a retained legacy endpoint for optional lightweight profile fields. It is not called by the current landing pages,
does not send Resend email, and does not increment `submission_count`.

The `/home-v6` through `/home-v9` forms collect email only. A successful submission joins the waitlist immediately
and does not require an email confirmation. They do not call the profile, price, or reservation APIs. V4 and V5
are archived, no-index pages with inactive forms that direct visitors to V9.

The `/15-homes` application opens on the configured external provider. Its answers are not written to
`waitlist_leads` or `analytics_events`. The provider should redirect successful submissions to `/15-homes/thanks` and
map the URL parameters `utm_*`, `source_route`, sanitized `referrer`, and `site_session_id` to hidden attribution fields.
The thanks page confirms receipt, not selection.

Camera model text and email remain in `waitlist_leads`; neither is copied into analytics. Only `definitely` and `probably` price-intent profiles can start a Founder checkout.

## Founder Reservation Flow

The Founder reservation is a $10 Stripe Checkout payment for priority access to the limited $419 Kickstarter Secret Reward. It is not a Kickstarter pledge, does not reduce the pledge price, and does not guarantee a unit.

`/api/reservations/checkout` resumes an existing open Checkout Session instead of creating repeated sessions. Signed Stripe webhooks update `checkout_started`, `paid`, `expired`, `refund_pending`, and `refunded` states. If a second payment intent reaches an already-paid reservation, the webhook refunds that duplicate payment.

`vercel.json` runs the refund worker daily. After `FOUNDER_RESERVATION_REFUND_AT`, it claims paid reservations idempotently, calls Stripe Refunds, and updates the lead only with the reservation status. Raw card data never reaches HarborNavi.

## Analytics Flow

`window.harborTrack` posts to `/api/events` with `navigator.sendBeacon`, falling back to `fetch` with `keepalive`. The event API stores only non-PII analytics data. Email addresses are not sent to `analytics_events`, and the server strips PII-like keys from the `properties` object.

`/api/events` assigns a one-year, HttpOnly, same-site `harbornavi_visitor_id` cookie. Unique visitors are counted by that first-party ID; historical rows without it fall back to `session_id`. Page views remain a separate raw activity count and are never labeled as visitors.

Tracked events include:

- `page_view`
- `early_bird_start`, `early_bird_submit`, `early_bird_saved`, `early_bird_error`
- `profile_submit`, `profile_saved`, `profile_error`
- `compatibility_check_start`, `compatibility_check_complete`
- `price_view`, `price_intent_submit`
- `reservation_start`, `reservation_complete`, `reservation_error`
- `waitlist_start`, `waitlist_submit`, `waitlist_saved`, `waitlist_error`
- `pilot_apply_start`, `pilot_apply_submit`, `pilot_apply_saved`, `pilot_apply_error`
- `discord_click`
- `road_home_apply_click`, `road_home_form_start`, `road_home_form_complete`
- `kickstarter_prelaunch_click`, `youtube_live_click`, `youtube_replay_click`
- `scenario_*`
- `product_carousel_next`
- `demo_option_package`, `demo_option_pet`, `demo_option_unusual`

## Admin Dashboard

`/admin666` has five tabs while `/admin` retains its previous production interface:

- Dashboard: separate Waitlist and Pilot funnels for 7-day, 30-day, or all-time ranges.
- Leads: lead table with status/source/interest/camera/connection/price/reservation filters, notes, status updates, and expanded CSV export.
- Pilot Applications: authenticated view and CSV export of the six Pilot Families application answers, source attribution, review status, and submission time. User-agent and accept-language request metadata remain server-only.
- Media: JPG, PNG, and GIF upload management for the two editable hero-carousel positions; the Pilot Families campaign remains fixed first.
- System: environment, database, waitlist, analytics, reservation table, Stripe gate, subscriber confirmation,
  Resend Contact sync, operator notification, Topic, and retry-state health.

Waitlist funnel definitions:

- Unique visitors: distinct first-party visitor IDs on non-Pilot page views, with a legacy session-ID fallback.
- Page views: `page_view` and legacy `page_view_home_v2`, excluding the Pilot route.
- Form starts: `early_bird_start` and `waitlist_start`.
- Form submits: `early_bird_submit` and `waitlist_submit`.
- Saved leads: `early_bird_saved` and `waitlist_saved`.
- Conversion rate: saved leads divided by unique visitors.

Pilot funnel definitions:

- Unique visitors: distinct first-party visitor IDs on `pilot-families` page views, with a legacy session-ID fallback.
- Page views: `page_view` and legacy `page_view_home_v2` on `pilot-families`.
- Form starts, submits, and saved applications: `pilot_apply_start`, `pilot_apply_submit`, and `pilot_apply_saved`.
- Conversion rate: saved applications divided by unique Pilot visitors.

Supporting metrics:

- Discord clicks: `discord_click`.
- Compatibility profiles: completed post-submit compatibility forms.
- Positive price rate: `definitely` plus `probably`, divided by completed price profiles.
- Founder reservations: leads in paid, refund-pending, or refunded reservation states.

Each funnel has its own table grouped by `route`, `utm_source`, and `utm_campaign`. Waitlist events never enter the Pilot table, and Pilot application events never enter the Waitlist table.

## Smoke Test

The prior double-opt-in V6 flow was accepted on 2026-07-29 and replaced on 2026-08-03 by immediate enrollment. New smoke
tests must verify an immediate confirmed response, no confirmation delivery, a synced Resend Contact, an operator alert,
and successful retry after an injected provider failure. The public V7 page shows only the `500+` milestone. The exact
waitlist total is calculated from server-only Vercel configuration and is available only in the authenticated admin.

After Vercel env vars and both database tables are ready, use a controlled Preview environment and an inbox that the
tester owns. Do not use a third party's address:

```sh
export SITE_ORIGIN='https://replace-with-preview-host.vercel.app'
export SMOKE_EMAIL='replace-with-an-inbox-you-control'

curl -X POST "$SITE_ORIGIN/api/events" \
  -H "content-type: application/json" \
  -d '{"event_name":"page_view","route":"home-v9","utm_source":"smoke","utm_campaign":"analytics_smoke","properties":{"smoke":true}}'

curl -X POST "$SITE_ORIGIN/api/waitlist" \
  -H "content-type: application/json" \
  -d "{\"email\":\"$SMOKE_EMAIL\",\"route\":\"home-v9\",\"form_location\":\"smoke\",\"utm_source\":\"smoke\",\"utm_campaign\":\"analytics_smoke\"}"
```

Confirm that the POST returns `subscription_status=confirmed` and `confirmation_email_required=false`, without an exact
waitlist total. Verify the Resend contact is `opt_in` for exactly one Kickstarter Topic and the operator alert is sent.
Also test duplicate submissions, an induced provider failure followed by cron recovery, and removal of Preview smoke
data. Duplicate email submissions must not increase the exact total shown in the authenticated admin.

Before enabling real reservations, repeat checkout, cancel, duplicate-click, webhook retry, and refund tests with Stripe test-mode keys and Stripe CLI forwarding to `/api/stripe/webhook`.

Then open the Preview deployment's `/admin`, sign in, confirm the Dashboard and Leads tabs show the test data, and
delete the smoke records from the Preview Neon database.
