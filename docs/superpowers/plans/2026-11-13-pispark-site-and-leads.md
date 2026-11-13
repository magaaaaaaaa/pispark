# PiSpark Website and Lead Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live site at `pispark.site` where a family books a free SAT math trial lesson, with every lead stored, emailed, reminded and tracked through stages in a private owner area.

**Architecture:** One Next.js app. Server routes validate a booking, write it to a Supabase Postgres table, and send email through Resend (reminders are scheduled at booking time with Resend's `scheduledAt`, so no cron is needed). Slot availability is computed from fixed owner windows minus booked trials. The owner area is the same app behind a password cookie.

**Tech Stack:** Next.js (App Router, TypeScript, latest stable via `create-next-app`), Tailwind CSS, Zod, `@supabase/supabase-js` (service-role key, server only), Resend, Vitest. Hosting: Vercel free tier. Domain: `pispark.site`.

**Spec:** `docs/2026-11-13-pispark-marketing-design.md`

**Scope:** This is plan 1 of 3. Plan 2 (content engine and weekly approval) and plan 3 (auto-posting to Instagram and Facebook) are written after this one is live. The owner area built here is where plan 2's approval page will be added.

## Global Constraints

- Offer copy, verbatim: "1-on-1 live SAT math lessons", "$17/hour founding-student rate", "packs of 8 lessons", "free 25-minute trial lesson".
- Trial length 25 minutes, offered on a 30-minute grid.
- Owner time is fixed UTC+5 (Astana, no daylight saving). Trial windows in owner time: Tuesday–Saturday 05:00–10:00, Saturday–Sunday 19:00–23:00.
- Slots are stored and transmitted as UTC ISO strings; visitors only ever see their own local time.
- Earliest bookable slot is 12 hours from now; latest is 14 days from now.
- Lead stages, exact strings: `new`, `trial_booked`, `trial_done`, `offer_sent`, `paying`, `not_now`, `lost`.
- A lead with role `student` must supply `parentEmail`; the parent is copied on the confirmation.
- Footer on every page: "SAT is a trademark of College Board, which is not affiliated with PiSpark."
- No score-gain promises anywhere in copy.
- The Meta Pixel loads only after cookie consent, and only if `NEXT_PUBLIC_META_PIXEL_ID` is set.
- Legal pages name "PiSpark", operated from Astana, Kazakhstan, contact `hello@pispark.site`.
- The Supabase service-role key and all secrets are read only in server code. Row-level security is enabled on every table with no policies.
- Free tiers only. No new paid service without the owner's say.

## Review Focus

1. Two families submit the same slot at the same moment: exactly one gets it, the other is told the slot was just taken and shown fresh slots. (Task 4, Task 6)
2. The email service fails after the lead is saved: the lead stays saved, the family still sees the thank-you page, and the failure is recorded on the lead. (Task 6)
3. A tampered request books a slot outside the owner's windows, in the past, or off the grid: rejected with a 400. (Task 6)
4. A US visitor books across a US daylight-saving change: the stored instant is correct and the confirmation shows the right local time for that date. (Task 2, Task 5)
5. The same family submits twice (double click, or returns later): no second lead for the same email with an upcoming trial; they are shown their existing booking. (Task 6)

---

## File Structure

```
app/
  layout.tsx                 shell, footer disclaimer, consent banner
  page.tsx                   landing page
  thanks/page.tsx            conversion page
  privacy/page.tsx, terms/page.tsx
  api/slots/route.ts         GET available slots
  api/book/route.ts          POST booking
  owner/login/page.tsx       password form
  owner/page.tsx             leads list
  owner/leads/[id]/page.tsx  lead detail, stage, notes, send offer
  owner/actions.ts           server actions for the owner area
components/
  BookingForm.tsx            form + slot picker (client)
  ConsentBanner.tsx, MetaPixel.tsx, UtmCapture.tsx
lib/
  config.ts                  constants from Global Constraints
  booking/slots.ts           slot generation
  leads/schema.ts            Zod schema + types
  leads/repo.ts              all database access
  email/templates.ts         email bodies
  email/ics.ts               calendar file
  email/send.ts              Resend wrapper
  booking/book.ts            booking orchestration
  admin/session.ts           owner session token
middleware.ts                guards /owner/*
supabase/migrations/0001_leads.sql
tests/                       mirrors lib/
```

---

### Task 1: Project scaffold and config

**Files:**
- Create: project root via `create-next-app` (TypeScript, Tailwind, App Router, no `src/` dir), `vitest.config.ts`, `lib/config.ts`, `.env.example`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces: `lib/config.ts` exporting
  `OWNER_UTC_OFFSET_MIN = 300`, `TRIAL_MINUTES = 25`, `SLOT_GRID_MIN = 30`, `MIN_LEAD_HOURS = 12`, `HORIZON_DAYS = 14`, `PRICE_PER_HOUR_USD = 17`, `PACK_SIZE = 8`,
  `WINDOWS: { days: number[]; startHour: number; endHour: number }[]` (days use 0 = Sunday, in owner time) equal to `[{days:[2,3,4,5,6],startHour:5,endHour:10},{days:[6,0],startHour:19,endHour:23}]`,
  `STAGES` (the seven strings, in the order above) and `type Stage`.

- [ ] **Step 1:** Scaffold in the existing `/home/user/pispark` folder (keep `docs/`), run `git init`, add Vitest with an `npm test` script running `vitest run`.
- [ ] **Step 2:** Write `tests/config.test.ts` asserting `STAGES` has exactly the seven strings in order and `WINDOWS` deep-equals the value above. Run `npm test`; expect FAIL (module missing).
- [ ] **Step 3:** Write `lib/config.ts`. Write `.env.example` listing: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM` (default `PiSpark <hello@pispark.site>`), `OWNER_EMAIL`, `TRIAL_CALL_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` (default `https://pispark.site`), `NEXT_PUBLIC_META_PIXEL_ID`.
- [ ] **Step 4:** Run `npm test` (PASS) and `npm run build` (succeeds).
- [ ] **Step 5:** Commit: `chore: scaffold site and config`.

### Task 2: Slot generation

**Files:**
- Create: `lib/booking/slots.ts`
- Test: `tests/booking/slots.test.ts`

**Interfaces:**
- Consumes: constants from `lib/config.ts`.
- Produces:
  `generateSlots(now: Date, booked: string[]): string[]` — ascending UTC ISO strings of free slot starts.
  `isValidSlot(slot: string, now: Date): boolean` — true only if `slot` is one `generateSlots(now, [])` would return.

- [ ] **Step 1:** Write failing tests, all with a fixed `now`:
  - `now = 2026-11-16T00:00:00Z` (Monday 05:00 owner time): first slot is `2026-11-17T00:00:00.000Z` (Tuesday 05:00 owner time; Monday has no window), and `2026-11-16T14:00:00.000Z` (Monday 19:00 owner) is absent.
  - Tuesday morning window yields exactly 10 slots, the last starting 09:30 owner time (`2026-11-17T04:30:00.000Z`).
  - Saturday `2026-11-21` yields 10 morning slots and 8 evening slots; the last evening slot is `2026-11-21T17:30:00.000Z`.
  - No slot is earlier than `now + 12h` or later than `now + 14 days`.
  - A slot listed in `booked` is omitted; its neighbours remain.
  - `isValidSlot` is false for a past slot, an off-grid time (`...T00:10:00.000Z`), a time outside windows, and a non-date string.
  - Daylight-saving check (with `now = 2027-03-10T00:00:00Z`): `2027-03-13T00:00:00.000Z` and `2027-03-16T00:00:00.000Z` (either side of the US change on 2027-03-14) are both generated when in range; formatting them with `Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', hour:'numeric', minute:'2-digit'})` gives `7:00 PM` and `8:00 PM`.
- [ ] **Step 2:** Run `npm test -- slots`; expect FAIL.
- [ ] **Step 3:** Implement both functions with plain `Date` arithmetic on the fixed 300-minute offset. No date library.
- [ ] **Step 4:** Run `npm test -- slots`; expect PASS.
- [ ] **Step 5:** Commit: `feat: trial slot generation`.

### Task 3: Lead schema

**Files:**
- Create: `lib/leads/schema.ts`
- Test: `tests/leads/schema.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const leadInputSchema: z.ZodType<LeadInput>
  export interface LeadInput {
    role: 'parent' | 'student'
    contactName: string        // 1–80 chars, trimmed
    studentName: string        // 1–80 chars, trimmed
    email: string              // lowercased
    parentEmail?: string       // required when role === 'student'; lowercased
    grade: '9' | '10' | '11' | '12' | 'other'
    testDate?: string          // free text, max 40, e.g. "March 2027"
    currentScore?: number      // integer 200–800, multiple of 10
    targetScore?: number       // integer 200–800, multiple of 10
    timezone: string           // IANA name accepted by Intl
    slot: string | null        // UTC ISO; null = "none of these times work"
    message?: string           // max 1000
    source: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string } // each max 100
    website: string            // honeypot, must be ''
  }
  export interface Lead extends Omit<LeadInput, 'website'> {
    id: string; stage: Stage; ownerNotes: string | null
    emailError: string | null; createdAt: string
  }
  ```

- [ ] **Step 1:** Write failing tests: a valid parent input parses; role `student` without `parentEmail` fails with an issue on path `parentEmail`; `email` `" Mom@Example.COM "` parses to `mom@example.com`; `currentScore` 805 and 190 fail; `timezone` `"Mars/Phobos"` fails; non-empty `website` fails; `slot: null` parses.
- [ ] **Step 2:** Run `npm test -- schema`; expect FAIL.
- [ ] **Step 3:** Implement with Zod. Validate `timezone` by constructing `Intl.DateTimeFormat` in a try/catch.
- [ ] **Step 4:** Run; expect PASS.
- [ ] **Step 5:** Commit: `feat: lead input schema`.

### Task 4: Database and repository

**Files:**
- Create: `supabase/migrations/0001_leads.sql`, `lib/leads/repo.ts`
- Test: `tests/leads/repo.test.ts`

**Interfaces:**
- Consumes: `Lead`, `LeadInput`, `Stage`.
- Produces (all async, server only):
  ```ts
  export class SlotTakenError extends Error {}
  createLead(input: LeadInput, ip: string | null): Promise<Lead>   // stage 'trial_booked' if slot, else 'new'; throws SlotTakenError
  getLead(id: string): Promise<Lead | null>
  listLeads(): Promise<Lead[]>                                    // newest first
  findUpcomingByEmail(email: string, now: Date): Promise<Lead | null>
  bookedSlots(from: Date): Promise<string[]>
  countRecentByIp(ip: string, since: Date): Promise<number>
  updateStage(id: string, stage: Stage): Promise<void>
  saveOwnerNotes(id: string, notes: string): Promise<void>
  recordEmailError(id: string, message: string): Promise<void>
  ```

- [ ] **Step 1:** Write the migration: table `leads` with snake_case columns for every `Lead` field plus `ip text`, `trial_at timestamptz` (the slot), `id uuid default gen_random_uuid()`, `stage text` with a check constraint listing the seven stages, `created_at timestamptz default now()`. Add `create unique index leads_trial_at_unique on leads (trial_at) where trial_at is not null and stage not in ('lost','not_now')`. Enable row-level security; add no policies.
- [ ] **Step 2:** Write failing tests against a mocked Supabase client (`vi.mock`): `createLead` maps camelCase to snake_case and sets stage `trial_booked` when `slot` is set and `new` when null; a Postgres error with code `23505` becomes `SlotTakenError`; any other error is rethrown; `bookedSlots` returns ISO strings ending in `.000Z` and filters out leads in stage `lost` or `not_now` (the same rule as the unique index, so a freed slot becomes bookable again).
- [ ] **Step 3:** Run `npm test -- repo`; expect FAIL.
- [ ] **Step 4:** Implement `repo.ts`. One private `client()` that reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` and throws a clear error if either is missing.
- [ ] **Step 5:** Run; expect PASS. Commit: `feat: leads table and repository`.

### Task 5: Emails and calendar file

**Files:**
- Create: `lib/email/templates.ts`, `lib/email/ics.ts`, `lib/email/send.ts`
- Test: `tests/email/templates.test.ts`, `tests/email/ics.test.ts`

**Interfaces:**
- Consumes: `Lead`, config constants.
- Produces:
  ```ts
  type Email = { subject: string; html: string; text: string }
  confirmationEmail(lead: Lead, callUrl: string): Email
  ownerNotificationEmail(lead: Lead, siteUrl: string): Email
  reminderEmail(lead: Lead, callUrl: string, kind: 'day' | 'hour'): Email
  offerEmail(lead: Lead, notes: string, siteUrl: string): Email
  formatLocal(slotIso: string, timezone: string): string   // "Monday, March 15, 2027 at 8:00 PM EDT"
  buildIcs(lead: Lead, callUrl: string): string             // 25-minute VEVENT in UTC
  sendEmail(args: { to: string; cc?: string; subject: string; html: string; text: string;
                    ics?: string; scheduledAt?: Date }): Promise<{ id: string }>
  ```

- [ ] **Step 1:** Write failing tests:
  - `formatLocal('2027-03-16T00:00:00.000Z','America/New_York')` contains `Monday, March 15, 2027` and `8:00 PM`; with `'2027-03-13T00:00:00.000Z'` it contains `7:00 PM`.
  - `confirmationEmail` text contains the student's name, the local time string, the call URL, and "25-minute"; for a lead with `slot: null` it instead says the owner will write within 24 hours with times, and contains no call URL.
  - `ownerNotificationEmail` contains grade, scores, test date, `utmSource`, and a link `${siteUrl}/owner/leads/${lead.id}`.
  - `offerEmail` contains the notes verbatim (HTML-escaped in `html`), `$17/hour`, and `8 lessons`; none of the four templates contain the word "guarantee".
  - User-supplied text `<script>` appears escaped in every `html`.
  - `buildIcs` contains `DTSTART:20270316T000000Z` and `DTEND:20270316T002500Z` for that slot, and uses CRLF line endings.
- [ ] **Step 2:** Run `npm test -- email`; expect FAIL.
- [ ] **Step 3:** Implement templates, `formatLocal` (via `Intl.DateTimeFormat` with `timeZoneName: 'short'`), `buildIcs`, and `sendEmail` as a thin wrapper over the Resend SDK (`from` = `EMAIL_FROM`, `.ics` as an attachment, `scheduledAt` passed through). `sendEmail` is not unit-tested; it is exercised in Task 10.
- [ ] **Step 4:** Run; expect PASS. Commit: `feat: lead emails and calendar file`.

### Task 6: Booking flow (server)

**Files:**
- Create: `lib/booking/book.ts`, `app/api/slots/route.ts`, `app/api/book/route.ts`
- Test: `tests/booking/book.test.ts`

**Interfaces:**
- Consumes: `leadInputSchema`, `isValidSlot`, `generateSlots`, the repo functions, the email functions.
- Produces:
  ```ts
  type BookResult =
    | { ok: true; leadId: string; existing: boolean }
    | { ok: false; status: 400; issues: { path: string; message: string }[] }
    | { ok: false; status: 409; reason: 'slot_taken'; slots: string[] }
    | { ok: false; status: 429 }
  bookTrial(raw: unknown, ctx: { ip: string | null; now: Date }): Promise<BookResult>
  ```
  `GET /api/slots` → `{ slots: string[] }` (not cached). `POST /api/book` → JSON `BookResult` with the matching HTTP status.

- [ ] **Step 1:** Write failing tests with the repo and email modules mocked:
  - Valid input: `createLead` called once; `sendEmail` called for family confirmation (with `ics`, and `cc` = `parentEmail` when role is `student`), for the owner, and twice with `scheduledAt` (24h and 1h before the slot). Result `{ ok: true, existing: false }`.
  - A slot less than 25 hours away schedules only the 1-hour reminder; less than 1 hour away schedules none.
  - `slot: null`: no reminders, no `ics`.
  - Honeypot filled: result is `{ ok: true }` but `createLead` and `sendEmail` are never called.
  - Slot fails `isValidSlot` (past, off-grid, outside windows): status 400, `createLead` not called.
  - `createLead` throws `SlotTakenError`: status 409 with fresh `slots` that exclude the taken one.
  - `sendEmail` rejects: result is still `{ ok: true }`, and `recordEmailError` is called with the lead id.
  - `findUpcomingByEmail` returns a lead: result `{ ok: true, existing: true }` with that lead's id; `createLead` not called.
  - `countRecentByIp` returns 5 or more (window: last hour): status 429.
- [ ] **Step 2:** Run `npm test -- book`; expect FAIL.
- [ ] **Step 3:** Implement `bookTrial` in that order of checks: parse → honeypot → rate limit → existing lead → slot validity → create → emails (each wrapped so one failure does not stop the others). Implement the two route handlers; the IP comes from the `x-forwarded-for` header's first entry.
- [ ] **Step 4:** Run; expect PASS. Commit: `feat: booking flow`.

### Task 7: Landing page, booking form, thank-you page

**Files:**
- Create: `app/layout.tsx`, `app/page.tsx`, `app/thanks/page.tsx`, `components/BookingForm.tsx`, `components/UtmCapture.tsx`, `components/ConsentBanner.tsx`, `components/MetaPixel.tsx`
- Test: `tests/components/utm.test.ts`

**Interfaces:**
- Consumes: `GET /api/slots`, `POST /api/book`, config constants.
- Produces: `readUtm(search: string): LeadInput['source']` exported from `components/UtmCapture.tsx`.

- [ ] **Step 1:** Write a failing test for `readUtm('?utm_source=instagram&utm_medium=bio&utm_campaign=launch&x=1')` → `{ utmSource:'instagram', utmMedium:'bio', utmCampaign:'launch' }`, and for values longer than 100 characters being truncated to 100. Run; expect FAIL. Implement; expect PASS.
- [ ] **Step 2:** Build the landing page with these sections in order: headline aimed at an SAT math score goal with a "Book a free trial lesson" button; how it works (three steps: book, 25-minute trial with a personal plan, weekly 1-on-1 lessons); what the trial includes; about the teacher (placeholder text clearly marked for the owner to replace); price (`$17/hour founding-student rate`, `packs of 8 lessons`); FAQ (digital SAT, time zones, what's needed for a call, how payment works: invoice after the trial, no card on the site); booking form.
- [ ] **Step 3:** Build `BookingForm`: fields from `LeadInput`; `timezone` pre-filled from `Intl.DateTimeFormat().resolvedOptions().timeZone`; slots grouped by local day and shown in local time; a "None of these times work" choice that sends `slot: null`; `parentEmail` shown and required when role is `student`; UTM values read from `sessionStorage` (written by `UtmCapture` on first page load). On 409, show "That time was just taken" and replace the slots with the returned list. On success, go to `/thanks`.
- [ ] **Step 4:** `/thanks` page: what happens next; fires the Pixel `Lead` event once if the Pixel is loaded. `ConsentBanner` stores the choice in `localStorage`; `MetaPixel` loads only after acceptance and only if the id env var is set. Footer disclaimer in `layout.tsx`.
- [ ] **Step 5:** Run `npm run build`, then `npm run dev` and check in a browser at phone width (390px) and desktop: the form submits against a mocked or local backend, slot times show in the browser's zone, and no layout breaks. Commit: `feat: landing page and booking form`.

### Task 8: Legal pages

**Files:**
- Create: `app/privacy/page.tsx`, `app/terms/page.tsx`

- [ ] **Step 1:** Privacy policy covering: who runs the site (PiSpark, Astana, Kazakhstan, `hello@pispark.site`); what is collected (the form fields, IP address, and with consent the Meta Pixel); why (arranging lessons, measuring ads); who processes it (Vercel, Supabase, Resend, Meta); under-18s (a parent's email is required and the parent is copied); how to ask for deletion (email); retention (leads that did not become students are deleted after 12 months).
- [ ] **Step 2:** Terms: trial is free and carries no obligation; lessons are invoiced in packs; rescheduling needs 12 hours' notice; no guaranteed score outcome; not affiliated with College Board.
- [ ] **Step 3:** Link both from the footer and beside the form's submit button. `npm run build`. Commit: `feat: privacy policy and terms`.

### Task 9: Owner area

**Files:**
- Create: `lib/admin/session.ts`, `middleware.ts`, `app/owner/login/page.tsx`, `app/owner/page.tsx`, `app/owner/leads/[id]/page.tsx`, `app/owner/actions.ts`
- Test: `tests/admin/session.test.ts`, `tests/admin/actions.test.ts`

**Interfaces:**
- Consumes: repo functions, `offerEmail`, `sendEmail`.
- Produces:
  ```ts
  createSessionToken(secret: string, now: Date): string          // HMAC-SHA256, valid 7 days
  verifySessionToken(token: string | undefined, secret: string, now: Date): boolean
  // server actions
  login(formData: FormData): Promise<void>
  setStage(id: string, stage: Stage): Promise<void>
  sendOffer(id: string, notes: string): Promise<{ ok: true } | { ok: false; error: string }>
  ```
  Cookie name `pispark_owner`, `httpOnly`, `secure`, `sameSite: 'lax'`.

- [ ] **Step 1:** Write failing tests: a fresh token verifies; a token 8 days old does not; a token altered by one character does not; `undefined` does not. `login` with the wrong password sets no cookie; compare passwords in constant time. `sendOffer` with notes shorter than 20 characters returns `{ ok: false }` and sends nothing; with valid notes it saves the notes, sends `offerEmail` to the lead (cc the parent when present) and sets stage `offer_sent`; if the email fails it returns `{ ok: false }` and leaves the stage unchanged. `setStage` rejects a string not in `STAGES`.
- [ ] **Step 2:** Run `npm test -- admin`; expect FAIL. Implement. Run; expect PASS.
- [ ] **Step 3:** `middleware.ts` redirects any `/owner/*` request (except `/owner/login`) without a valid cookie to `/owner/login`. Every server action re-checks the cookie itself.
- [ ] **Step 4:** Leads list: one row per lead with student name, stage, trial time in owner time (UTC+5), source, and a warning mark when `emailError` is set; counts per stage at the top. Lead detail: all fields, stage buttons, notes box, "Send offer" button, and plain `mailto:` link. All `/owner` pages send `noindex`.
- [ ] **Step 5:** `npm run build`; check in a browser that `/owner` redirects when logged out. Commit: `feat: owner area`.

### Task 10: Go live

**Files:**
- Create: `README.md` (environment variables, how to run, how to deploy), `docs/owner-setup.md` (the owner's one-time steps in plain language)

Owner steps are marked **OWNER**; they cannot be done by the builder.

- [ ] **Step 1:** Create a Supabase project named `pispark` on the free tier (confirm the cost shown is $0 with the owner first) and apply `0001_leads.sql`. Run the security advisor; expect no table without row-level security.
- [ ] **Step 2:** **OWNER:** create a free Resend account, add the domain `pispark.site`, and paste the DNS records it shows into the domain registrar. Builder verifies the domain shows as verified.
- [ ] **Step 3:** **OWNER:** supply `OWNER_EMAIL`, a permanent video-call link for `TRIAL_CALL_URL`, and choose an `ADMIN_PASSWORD`.
- [ ] **Step 4:** Deploy to Vercel, set every variable from `.env.example`, and attach `pispark.site` (the owner adds the DNS records Vercel shows).
- [ ] **Step 5:** Live check on `https://pispark.site`: book a real test trial with a personal address. Expect: thank-you page; confirmation email with a working calendar file and the right local time; owner notification; the lead visible in `/owner`; the slot gone from the form; two scheduled reminders visible in Resend. Send a test offer from the owner area and confirm it arrives. Then mark the test lead `lost` and confirm the slot reappears.
- [ ] **Step 6:** Set the Instagram bio link to `https://pispark.site/?utm_source=instagram&utm_medium=bio` (**OWNER**) and confirm a booking through it records the source.
- [ ] **Step 7:** Commit: `docs: setup and deployment notes`.
