# HarborNavi Site

Prelaunch landing page for `harbornavi.com`.

This project is intentionally separate from the HarborNavi product coordination repository. HarborNavi docs remain the source of truth for GTM and product decisions; this repo is only the public landing page implementation.

## Routes

- `/home`: combined HarborNavi positioning.
- `/home-v2`: earlier HarborNavi early-access page retained for comparison.
- `/home-v3`: five-question product narrative retained for comparison.
- `/home-v4`: earlier Kickstarter pre-launch page retained for comparison.
- `/home-v5`: current product pre-launch page with an email-only launch-list conversion.
- `/15-homes`: public 15 Homes Across America field-test, host-application, and viewing hub.
- `/15-homes/thanks`: application receipt page for the external host form; receipt does not mean selection.
- `/package`: package alert beta positioning.
- `/pets`: pet highlights beta positioning.
- `/privacy`: product waitlist and 15 Homes campaign privacy direction.
- `/admin`: password-protected waitlist lead admin.
- `/api/waitlist`: waitlist submission endpoint.
- `/api/waitlist/profile`: optional post-submit lead profile endpoint.
- `/api/reservations/*`: configuration-gated Founder priority reservation checkout and status endpoints.
- `/api/stripe/webhook`: signed Stripe lifecycle webhook.
- `/api/cron/refund-reservations`: scheduled automatic refund worker.
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
- The `/home-v2` waitlist form posts to `/api/waitlist` and stores leads in Neon Postgres.
- The `/home-v2` success state can save optional `primary_interest`, `camera_setup`, and `beta_intent` profile fields.
- The `/home-v4` flow saves the email, then shows a thank-you dialog with an optional Discord link. It does not show pricing, a compatibility questionnaire, or Founder reservation UI.
- The `/home-v5` flow remains email-only. Its consent copy covers Kickstarter and 15 Homes road updates; the success dialog offers an optional link to the separate host-application page.
- Campaign dates and public destinations are centralized in `src/data/campaign.ts`. External Tally/application, Kickstarter, and YouTube URLs come only from `PUBLIC_*` environment variables and render a clear unavailable state while empty. The application also requires `PUBLIC_ROAD_HOMES_PRIVACY_READY=true` after its provider, retention, deletion contact, and applicant rights are published.
- Central milestones are Kickstarter pre-launch on `2026-09-15`, the road field test on `2026-11-12..2026-12-05`, the public field report on `2026-12-12`, and the planned Kickstarter launch on `2027-01-12`.
- The external 15 Homes application is not written to the site's waitlist or analytics tables. Its provider should redirect completed applications to `/15-homes/thanks`.
- After a waitlist database save, the API can best-effort sync the email to two pre-existing Resend topics. Missing configuration or a provider failure never rolls back the saved lead; operator notification remains a separate Resend call.
- Compatibility model research and price-fit testing remain separate follow-up work; the existing profile and reservation APIs are retained but are not called by `/home-v4`.
- The `/admin` page has Dashboard, Leads, and System tabs for first-party funnel analytics and lead operations.
- Backend setup lives in `docs/waitlist-backend.md`; database schema lives in `db/waitlist.sql` and `db/analytics.sql`.
- Existing Neon projects should apply `db/growth-v4.sql` before deploying the v4 APIs.
- Analytics is first-party and stored in Neon; no GA, PostHog, Plausible, or paid pixels are installed.
- Campaign analytics accepts `road_home_apply_click`, `road_home_form_start`, `road_home_form_complete`, `kickstarter_prelaunch_click`, `youtube_live_click`, and `youtube_replay_click`. Application answers and PII are not sent with those events.
