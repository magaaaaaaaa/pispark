# PiSpark SAT Math — marketing and lead pipeline design

Date: 2026-11-13. Status: approved by owner 2026-11-13 (answered the open questions, no changes requested).

Lines marked **(my call)** are decisions the owner has not made; they are
proposals and can be changed. Everything else is what the owner said.

## Intent

PiSpark is a new online school offering 1-on-1 live SAT math lessons in
English, taught over video call. One teacher today (the owner); more
tutors from the owner's network if demand grows. No students yet, no
website. An Instagram professional account (@pispark.math) and a Facebook
presence exist.

The owner wants Instagram and Facebook to run almost without them:
content gets made and posted automatically, every interested family
moves through one clear path to becoming a paying student, and the
marketing reaches the families who actually need SAT math help. Paid ads
come after the organic system works.

## Goals

1. A website where a family can understand the offer and book a free
   trial lesson in under two minutes.
2. Every lead captured in one place with a stage, so nothing is lost and
   drop-off is visible.
3. Instagram and Facebook posts created, checked and published on a
   schedule, with one short weekly approval from the owner.
4. Measurement in place (Meta Pixel and booking events) so paid ads can
   be switched on later with real conversion data.

## Non-goals (this version)

- Running paid ads. The build only prepares for them.
- Taking payment on the site. Paying students are invoiced by hand
  (PayPal/Wise link) until volume justifies checkout.
- Automated Instagram DM replies. That needs Meta app review; instead
  the bio link and Instagram's built-in saved replies point to the
  booking page.
- Video reels. Version one posts images and carousels. Reels reach more
  people, so they are the first follow-up project.
- Any curriculum other than SAT math.
- A tutor marketplace or multi-teacher scheduling.

## Anti-goals

- A post with a wrong answer or a sloppy solution. For a math school
  this is worse than not posting.
- Copying real College Board questions. All questions are original,
  written in the style of the digital SAT.
- Implying affiliation with College Board, or promising score gains.
- Collecting data from children carelessly. The form is addressed to
  parents; a student under 18 who fills it in must give a parent's email.
- Anything that looks like spam or automation abuse and risks the
  accounts (mass follows, auto-comments, bought followers).

## Constraints

- Meta limits ad targeting of under-18s to age and location, so ads aim
  at parents; students are reached through organic content.
- Publishing through Instagram's API needs a professional account (done),
  a Meta developer app owned by the owner, and an access token. Posting
  to the owner's own account works without Meta app review. Tokens last
  about 60 days and must be refreshed automatically.
- Facebook auto-posting needs a Facebook *Page*, not a personal profile.
  The existing link is a `profile.php?id=` address, which may be either.
  If it is a personal profile, the owner creates a Page (five minutes).
- Instagram's API publishes images from a public URL, in JPEG.
- Budget is near zero: free tiers wherever possible.
- The owner is one person. Weekly effort after launch should be about
  ten minutes of approvals plus teaching trial lessons.

## Approaches considered

- **A. Manual tools.** Monthly content batch handed over, owner uploads
  to Meta's scheduler, Calendly for bookings. Unbreakable, but the owner
  does uploads forever and leads are scattered.
- **B. Fully automated system.** Website with booking and lead tracking,
  content engine, auto-posting, weekly approval. More to build, about
  30 minutes of one-time Meta setup by the owner.
- **C. Staged.** Website and leads first, manual posting, automation
  later.

**Chosen: B**, built in C's order — website and lead capture first,
because they do not depend on Meta's setup wait, then content engine,
then auto-posting.

## The offer

- 1-on-1 live SAT math lessons, English, by video call.
- First step for every lead: a free 25-minute trial call that includes a
  short diagnostic and a personal plan **(my call)**.
- Price: $17/hour, framed as a founding-student rate (owner's decision).
  Sold in packs of 8 lessons **(my call)**.
- Audience: US high school students in grades 10–12 preparing for the
  SAT, and their parents; plus international students applying to US
  colleges. Geographic focus starts with the United States **(my call)**.

## The lead path

```
post / reel / ad
      |
bio link or ad link  --->  website (pispark landing page)
                                |
                     "Book a free trial lesson" form
                     (who you are, grade, test date,
                      current and target score, email,
                      time zone, pick a slot)
                                |
        lead saved  ->  confirmation email to family
                    ->  notification to owner
                    ->  event in owner's calendar
                    ->  reminders before the call
                                |
                           trial call
                                |
        owner marks outcome -> follow-up email with plan + offer
                                |
                    paying student   /   not now (nurture)
```

Lead stages: `new`, `trial booked`, `trial done`, `offer sent`, `paying`,
`lost`. The owner sees all leads on one private page and changes a stage
with one click; stage changes trigger the matching email.

Each lead records where it came from (Instagram bio, Facebook, a specific
ad, direct), using link tags, so later ad spend can be judged.

## The website

One landing page plus supporting pages:

- Landing: headline about SAT math score goals, how lessons work, who the
  teacher is, what the trial includes, price, FAQ, booking form.
- Privacy policy and terms (required for ads and for the Meta app).
- Thank-you page after booking (this is the conversion event).
- Private owner area: leads list, weekly post approval.

Hosting on Vercel's free tier, served at `pispark.site`.

## The content engine

Posting rhythm **(my call)**: five posts a week, identical on Instagram
and Facebook.

| Day | Post | Purpose |
|-----|------|---------|
| Mon | SAT question of the week (carousel: question, hint, worked solution) | reach students, show teaching quality |
| Tue | Common mistake and how to avoid it | saves and shares |
| Wed | Quick strategy or Desmos calculator trick | high share rate |
| Thu | Parent post: timelines, score goals, how to plan prep | speaks to the buyer |
| Fri | Second question, harder | engagement |

Around official SAT test dates and registration deadlines the calendar
swaps in countdown and planning posts. Dates are looked up from College
Board each season, never assumed.

How a week is produced:

1. Once a week a batch is generated: topics chosen from a rotating list
   covering the digital SAT math domains (algebra, advanced math,
   problem solving and data analysis, geometry and trigonometry), so
   topics do not repeat too soon.
2. Every question's answer is verified by actually computing it, not
   just by reading it over. A post that fails verification is dropped
   and regenerated.
3. Posts are rendered as branded images (math typeset properly) with a
   caption, hashtags and a call to action pointing to the bio link.
4. The owner gets an email: "next week's posts are ready". On the
   approval page they see each post as it will appear and can approve,
   edit the caption, or reject. One "approve all" button.
5. Only approved posts publish. If nothing is approved, nothing goes
   out, and the owner is reminded once.
6. Published posts are logged with their Instagram/Facebook IDs; failures
   notify the owner.

Every image carries a small footer: "SAT is a trademark of College Board,
which is not affiliated with PiSpark."

## Finding the right people

Organic:

- Content is the targeting. Posts name the exam, the score range and the
  problem ("stuck at 600 in SAT math?"), so the people who engage are
  the people who need it.
- Hashtags and keywords focused on SAT prep, digital SAT, college
  admissions; captions written for search.
- Bio states the offer in one line and links to the booking page.

Paid, later (planned, not built now):

- Audience: parents aged 38–58 in the US; separately, ages 16–18 by
  location only, as Meta allows.
- Optimise for the booking event, not clicks, so Meta learns who books.
- Creatives are the organic posts that performed best.
- Start at $5–10/day, one campaign, three creatives; judge by cost per
  booked trial, then cost per paying student.
- Retarget site visitors who did not book.

## What the owner has to do

One-time:

- Confirm or create a Facebook Page and link it to the Instagram account.
- Create a Meta developer app and grant posting access (step-by-step
  guide supplied by the builder).
- Give weekly availability and time zone for trial calls.
- Decide price, domain, and approve the look.
- Provide a short bio and, ideally, a photo and any SAT credentials.

Weekly: approve the batch; teach trials; click a stage after each trial.

## Settled after review (all my calls)

- **Trial plan:** no hosted diagnostic. During the trial the owner works
  a few problems with the student, then types three or four lines of
  notes into the lead's record. The follow-up email is a template that
  inserts those notes and the offer.
- **"Not now":** a seventh stage, `not now`, which is only a label in
  this version. No recurring email sequence.
- **AI and running cost:** weekly batches are produced by a scheduled
  Claude session under the subscription the owner already uses. No
  pay-per-use API spend. If a scheduled run fails, the owner can ask for
  a batch by hand.
- **Consent:** a simple cookie banner; the Meta Pixel loads only after
  consent, for all visitors.
- **Under-18 bookings:** the booking goes ahead, the parent's email is
  required, and the parent is copied on the confirmation.

## Owner's answers (2026-11-13)

- **Domain:** `pispark.site`, already bought. The site, email sending
  and Meta domain verification all use it.
- **Location:** Astana, Kazakhstan (UTC+5). The owner accepts lessons at
  inconvenient local hours.
- **Price:** $17/hour, framed as a founding-student rate.

Following from those (my calls):

- Trial slots are offered where US students are free: US weekday
  evenings (about 05:00–10:00 Astana time) and US weekend mornings
  (about 19:00–23:00 Astana time). Families always see their own local
  time. The owner can narrow these windows.
- Legal pages name "PiSpark", operated from Astana, Kazakhstan, with a
  contact address at the domain (for example `hello@pispark.site`). The
  owner's personal name is added only if they want it.

## Left to the builder

- Exact stack. Suggested: Next.js on Vercel, Supabase for leads and the
  post queue, scheduled jobs for publishing and token refresh, a
  transactional email service with a free tier.
- Booking mechanics: an embedded scheduling tool versus a built-in slot
  picker tied to the owner's Google Calendar. Whichever needs the fewest
  accounts and handles time zones and reminders reliably.
- How the weekly batch generation is triggered (scheduled AI session
  versus an API call from the site) and how answer verification is run.
- Image rendering method, visual identity details, copy.
- Protection of the private owner area.
- Spam protection on the form.
