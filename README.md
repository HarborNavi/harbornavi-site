# HarborNavi Site

Prelaunch landing page for `harbornavi.com`.

This project is intentionally separate from the HarborNavi product coordination repository. HarborNavi docs remain the source of truth for GTM and product decisions; this repo is only the public landing page implementation.

## Routes

- `/` and `/home`: permanent redirects to the current `/home-v6` landing page.
- `/home-v6`: current HarborNavi pre-launch page with a confirmed email subscription flow.
- `/home-v7`: isolated campaign version with the three-position hero carousel and Pilot Families entry point.
- `/home-v2`: earlier HarborNavi early-access page retained for comparison.
- `/home-v3`: five-question product narrative retained for comparison.
- `/home-v4`: archived Kickstarter concept, marked `noindex`; its form is inactive.
- `/home-v5`: archived pre-launch concept, marked `noindex`; its form is inactive.
- `/15-homes`: public 15 Homes Across America field-test, host-application, and viewing hub.
- `/15-homes/thanks`: application receipt page for the external host form; receipt does not mean selection.
- `/pilot-families`: first-five-family pilot details and application form.
- `/package`: package alert beta positioning.
- `/pets`: pet highlights beta positioning.
- `/privacy`: product waitlist and 15 Homes campaign privacy direction.
- `/admin`: password-protected waitlist lead admin.
- `/admin666`: isolated campaign admin with Pilot Applications and Media management.
- `/api/waitlist`: waitlist submission endpoint.
- `/api/waitlist/confirm`: signed email-confirmation endpoint.
- `/api/waitlist/profile`: optional post-submit lead profile endpoint.
- `/api/reservations/*`: configuration-gated Founder priority reservation checkout and status endpoints.
- `/api/stripe/webhook`: signed Stripe lifecycle webhook.
- `/api/cron/refund-reservations`: scheduled automatic refund worker.
- `/api/cron/retry-waitlist`: authenticated confirmation, contact-sync, and operator-alert retry worker.
- `/api/events`: first-party analytics event endpoint.
- `/api/admin/*`: admin login, health check, analytics, and lead management endpoints.
- `/api/admin/pilot-applications`: authenticated Pilot Families application list, routed through the existing admin health function.
- `/api/assets`: public hero-carousel delivery plus authenticated admin media upload and activation.
- `/api/pilot-application`: Pilot Families application endpoint, routed through the existing waitlist function without marketing consent.

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
- `/home-v6` remains the default landing page; `/home-v7` is deployed as an isolated campaign version. V4 and V5 remain available only as no-index visual history and no longer accept email.
- A V6 form submission stores a pending lead in Neon and sends a signed confirmation link that expires after seven days. Only a confirmed address is synced to the HarborNavi Kickstarter Resend Topic and followed by an operator alert.
- Integration state is stored in `waitlist_leads.metadata`. GitHub Actions invokes `/api/cron/retry-waitlist` hourly, with a daily Vercel Cron fallback compatible with the Hobby plan. The worker retries eligible confirmation, contact-sync, and operator-alert failures, initializes the Kickstarter Topic when needed, and purges unconfirmed V6 leads after 30 days.
- The Kickstarter Topic uses `default_subscription=opt_out`, while each confirmed address is explicitly synced as `opt_in`. `RESEND_KICKSTARTER_TOPIC_ID` is an optional override; the V6 flow has no Road Topic dependency.
- Vercel Production uses the Neon `main` branch. Vercel Preview uses the permanent schema-only Neon `preview` branch, so Fiona's Preview submissions cannot write to production lead or analytics data.
- The complete production flow was accepted on 2026-07-29: pending submission, confirmation email and signed link, Resend Contact/Topic sync, operator alert, authenticated retry recovery, and formal-domain smoke checks all passed.
- Campaign dates and public destinations are centralized in `src/data/campaign.ts`. External Tally/application, Kickstarter, and YouTube URLs come only from `PUBLIC_*` environment variables and render a clear unavailable state while empty. The application also requires `PUBLIC_ROAD_HOMES_PRIVACY_READY=true` after its provider, retention, deletion contact, and applicant rights are published.
- Central milestones are Kickstarter pre-launch on `2026-09-15`, the road field test on `2026-11-12..2026-12-05`, the public field report on `2026-12-12`, and the planned Kickstarter launch on `2027-01-12`.
- The external 15 Homes application is not written to the site's waitlist or analytics tables. Its provider should redirect completed applications to `/15-homes/thanks`.
- Resend Broadcasts, rather than the transactional Email API, are used for reviewed Kickstarter marketing sends and unsubscribe handling.
- Compatibility model research and price-fit testing remain separate follow-up work; the existing profile and reservation APIs are retained but are not called by `/home-v6` or `/home-v7`.
- The `/admin666` page has Dashboard, Leads, Pilot Applications, Media, and System tabs for first-party funnel analytics, application review, and lead operations. The existing `/admin` route remains unchanged.
- Backend setup lives in `docs/waitlist-backend.md`; database schema lives in `db/waitlist.sql` and `db/analytics.sql`.
- Existing Neon projects should apply `db/growth-v4.sql` before deploying the v4 APIs.
- Analytics is first-party and stored in Neon; no GA, PostHog, Plausible, or paid pixels are installed.
- Campaign analytics accepts `road_home_apply_click`, `road_home_form_start`, `road_home_form_complete`, `kickstarter_prelaunch_click`, `youtube_live_click`, and `youtube_replay_click`. Application answers and PII are not sent with those events.
- The private `/admin666` Media tab uploads JPG, PNG, and GIF files to Vercel Blob and stores their metadata in `site_media`. The pilot campaign stays fixed in the first carousel position; admins can manage the other two positions. Configure `BLOB_READ_WRITE_TOKEN` before enabling uploads.
- Pilot Families applications are stored separately in `pilot_family_applications`; submitting this form does not join the Kickstarter marketing Topic. The two new tables are initialized idempotently on first use, while `db/media.sql` and `db/pilot-families.sql` remain the explicit migration records.
