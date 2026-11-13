# PiSpark

Website and lead pipeline for PiSpark, 1-on-1 live SAT math lessons. Live at `https://pispark.site`.

- Design: `docs/2026-11-13-pispark-marketing-design.md`
- Build plan: `docs/superpowers/plans/2026-11-13-pispark-site-and-leads.md`
- Owner guide, in plain language: `docs/owner-guide.md`

## What it does

A two-step funnel built so that no lead is lost:

1. **Capture.** A first name and an email save the lead (`POST /api/lead`). The family gets an
   instant reply with one-tap times; the owner gets an alert.
2. **Pick a time.** On `/pick` or from the email, the family books or moves a free 25-minute
   trial (`POST /api/pick`). Confirmation with a calendar file, reminders 24 hours and 1 hour
   before.
3. **Follow-up.** Leads who have not booked get five emails over 14 days, cancelled when they
   book, unsubscribe, or are marked lost.

The owner tracks leads through stages at `/owner` and sends the post-trial offer from there.

The original design is in `docs/2026-11-13-pispark-marketing-design.md`; the funnel described
here replaced its nine-field booking form on 2026-11-14.

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
| `RESEND_API_KEY` | API key from Resend (the name `RESEND` is accepted too) |
| `EMAIL_FROM` | Sender, e.g. `PiSpark <book_a_lesson@pispark.site>`. The domain must be verified in Resend |
| `OWNER_EMAIL` | Where new-lead notifications go; also the reply-to on emails to families |
| `TRIAL_CALL_URL` | Video call link put in confirmations. May be empty: emails then say the link will follow |
| `ADMIN_PASSWORD` | Password for `/owner`. Use a long one |
| `SESSION_SECRET` | Random string, 32+ characters. Signs the owner session cookie and the links in emails. Changing it breaks links already sent |
| `NEXT_PUBLIC_SITE_URL` | `https://pispark.site` |
| `NEXT_PUBLIC_META_PIXEL_ID` | Optional. When set, a cookie notice appears and the Pixel loads after consent |

## Database

Apply the files in `supabase/migrations/` in order to the Supabase project. Row-level security is on
with no policies: only the server, using the service-role key, can read or write leads.

## Where things are

- `lib/config.ts` — price, trial length, trial windows (owner time, UTC+5), lead stages
- `lib/booking/` — slot generation
- `lib/funnel/` — capture, time picking, follow-ups, signed link tokens
- `lib/leads/` — input validation and all database access
- `lib/email/` — email text, calendar file, sending
- `app/owner/` — private owner area; `proxy.ts` guards it and every action re-checks the session
- `app/page.tsx` — landing page copy

To change the trial times, edit `WINDOWS` in `lib/config.ts` and update the matching test in
`tests/config.test.ts`.
