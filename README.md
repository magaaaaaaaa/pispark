# PiSpark

Website and lead pipeline for PiSpark, 1-on-1 live SAT math lessons. Live at `https://pispark.site`.

- Design: `docs/2026-11-13-pispark-marketing-design.md`
- Build plan: `docs/superpowers/plans/2026-11-13-pispark-site-and-leads.md`
- Owner's one-time setup, in plain language: `docs/owner-setup.md`

## What it does

A family books a free 25-minute trial lesson on the site. The booking is saved as a lead,
the family gets a confirmation with a calendar file, the owner gets a notification, and
reminders are scheduled for 24 hours and 1 hour before. The owner tracks every lead through
stages at `/owner` and sends the follow-up offer from there.

## Stack

Next.js (App Router) on Vercel, Supabase Postgres for leads, Resend for email, Vitest for tests.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

```bash
npm test        # unit tests
npm run lint
npm run build
```

## Environment variables

| Name | What it is |
|------|------------|
| `SUPABASE_URL` | Project URL from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key. Never expose it to the browser |
| `RESEND_API_KEY` | API key from Resend |
| `EMAIL_FROM` | Sender, e.g. `PiSpark <hello@pispark.site>`. The domain must be verified in Resend |
| `OWNER_EMAIL` | Where new-lead notifications go; also the reply-to on emails to families |
| `TRIAL_CALL_URL` | Video call link put in confirmations. May be empty: emails then say the link will follow |
| `ADMIN_PASSWORD` | Password for `/owner`. Use a long one |
| `SESSION_SECRET` | Random string, 32+ characters, that signs the owner session cookie |
| `NEXT_PUBLIC_SITE_URL` | `https://pispark.site` |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional. When set, a cookie notice appears and the Pixel loads after consent |

## Database

Apply `supabase/migrations/0001_leads.sql` to the Supabase project. Row-level security is on
with no policies: only the server, using the service-role key, can read or write leads.

## Where things are

- `lib/config.ts` — price, trial length, trial windows (owner time, UTC+5), lead stages
- `lib/booking/` — slot generation and the booking flow
- `lib/leads/` — input validation and all database access
- `lib/email/` — email text, calendar file, sending
- `app/owner/` — private owner area; `proxy.ts` guards it and every action re-checks the session
- `app/page.tsx` — landing page copy

To change the trial times, edit `WINDOWS` in `lib/config.ts` and update the matching test in
`tests/config.test.ts`.
