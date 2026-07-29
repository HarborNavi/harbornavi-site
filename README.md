# HarborNavi Site

Prelaunch landing page for `harbornavi.com`.

This project is intentionally separate from the HarborNavi product coordination repository. HarborNavi docs remain the source of truth for GTM and product decisions; this repo is only the public landing page implementation.

## Routes

- `/` and `/home`: permanent redirects to the current `/home-v6` landing page.
- `/home-v6`: current HarborNavi pre-launch page with a confirmed email subscription flow.
- `/home-v2`: earlier HarborNavi early-access page retained for comparison.
- `/home-v3`: five-question product narrative retained for comparison.
- `/home-v4`: archived Kickstarter concept, marked `noindex`; its form is inactive.
- `/home-v5`: archived pre-launch concept, marked `noindex`; its form is inactive.
- `/15-homes`: public 15 Homes Across America field-test, host-application, and viewing hub.
- `/15-homes/thanks`: application receipt page for the external host form; receipt does not mean selection.
- `/package`: package alert beta positioning.
- `/pets`: pet highlights beta positioning.
- `/privacy`: product waitlist and 15 Homes campaign privacy direction.
- `/admin`: password-protected waitlist lead admin.
- `/api/waitlist`: waitlist submission endpoint.
- `/api/waitlist/confirm`: signed email-confirmation endpoint.
- `/api/waitlist/profile`: optional post-submit lead profile endpoint.
- `/api/reservations/*`: configuration-gated Founder priority reservation checkout and status endpoints.
- `/api/stripe/webhook`: signed Stripe lifecycle webhook.
- `/api/cron/refund-reservations`: scheduled automatic refund worker.
- `/api/cron/retry-waitlist`: hourly confirmation, contact-sync, and operator-alert retry worker.
- `/api/events`: first-party analytics event endpoint.
- `/api/admin/*`: admin login, health check, analytics, and lead management endpoints.

## Commands

```bash
npm install
npm run dev
npm run build
```

Use `npm run preview` after `npm run build` when checking production-style routing locally.
Astro dev serves `/package/` correctly, but bare `/package` can collide with `package.json` in dev mode. Production preview and static output serve `/package` correctly.

## Current Notes

- Hero visuals are generated storyboard placeholders under `public/assets/`.
- `/home-v6` is the only current landing page. V4 and V5 remain available only as no-index visual history and no longer accept email.
- A V6 form submission stores a pending lead in Neon and sends a signed confirmation link that expires after seven days. Only a confirmed address is synced to the HarborNavi Kickstarter Resend Topic and followed by an operator alert.
- Integration state is stored in `waitlist_leads.metadata`. The hourly `/api/cron/retry-waitlist` job retries eligible confirmation, contact-sync, and operator-alert failures, initializes the Kickstarter Topic when needed, and purges unconfirmed V6 leads after 30 days.
- The Kickstarter Topic uses `default_subscription=opt_out`, while each confirmed address is explicitly synced as `opt_in`. `RESEND_KICKSTARTER_TOPIC_ID` is an optional override; the V6 flow has no Road Topic dependency.
- Campaign dates and public destinations are centralized in `src/data/campaign.ts`. External Tally/application, Kickstarter, and YouTube URLs come only from `PUBLIC_*` environment variables and render a clear unavailable state while empty. The application also requires `PUBLIC_ROAD_HOMES_PRIVACY_READY=true` after its provider, retention, deletion contact, and applicant rights are published.
- Central milestones are Kickstarter pre-launch on `2026-09-15`, the road field test on `2026-11-12..2026-12-05`, the public field report on `2026-12-12`, and the planned Kickstarter launch on `2027-01-12`.
- The external 15 Homes application is not written to the site's waitlist or analytics tables. Its provider should redirect completed applications to `/15-homes/thanks`.
- Resend Broadcasts, rather than the transactional Email API, are used for reviewed Kickstarter marketing sends and unsubscribe handling.
- Compatibility model research and price-fit testing remain separate follow-up work; the existing profile and reservation APIs are retained but are not called by `/home-v6`.
- The `/admin` page has Dashboard, Leads, and System tabs for first-party funnel analytics and lead operations.
- Backend setup lives in `docs/waitlist-backend.md`; database schema lives in `db/waitlist.sql` and `db/analytics.sql`.
- Existing Neon projects should apply `db/growth-v4.sql` before deploying the v4 APIs.
- Analytics is first-party and stored in Neon; no GA, PostHog, Plausible, or paid pixels are installed.
- Campaign analytics accepts `road_home_apply_click`, `road_home_form_start`, `road_home_form_complete`, `kickstarter_prelaunch_click`, `youtube_live_click`, and `youtube_replay_click`. Application answers and PII are not sent with those events.
