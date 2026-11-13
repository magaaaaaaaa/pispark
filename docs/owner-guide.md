# Owner guide

## How a lead moves

1. Someone leaves a first name and an email on `pispark.site` (or `pispark.site/book_a_lesson`).
   The lead is saved at that moment.
2. They get an email straight away with three times to tap, and you get a "New lead" email.
3. They pick a time on the site or from the email. You get a "Trial booked" email with a
   calendar file. They get a confirmation and two reminders.
4. If they do not pick a time, they get five short emails over two weeks (days 1, 3, 6, 10
   and 14). These stop when they book, unsubscribe, or you mark the lead "Lost" or "Not now".
5. After the trial, open the lead at `pispark.site/owner`, write three or four lines, and
   press "Send offer".

**The single most useful thing you can do:** when a "New lead" email arrives, reply to the
family yourself within the hour. A short personal note ("Hi Dana, I saw you signed up. Does
Tuesday evening work?") books more trials than any automation.

## Set up automatic replies on Instagram and Facebook (10 minutes, no code)

People who will not fill in a form will send a message. Meta's own tools can answer at once.

1. Open **Meta Business Suite** (business.facebook.com) → **Inbox** → **Automations**.
2. **Instant reply**: turn on for Instagram and Messenger. Suggested text:

   > Hi! Thanks for messaging PiSpark. Your first SAT math lesson is free (25 minutes,
   > 1-on-1). Grab it here in ten seconds: https://pispark.site/book_a_lesson?utm_source=instagram&utm_medium=dm
   > A real person will reply here soon too.

3. **Frequently asked questions**: add three:
   - "How much is it?" → "$17 an hour, 1-on-1, live. The first 25-minute lesson is free."
   - "How does the free lesson work?" → "Leave your email at pispark.site/book_a_lesson, pick a
     time, and we meet on a video call. No card."
   - "Is this for the digital SAT?" → "Yes, including how to use the built-in Desmos calculator."
4. **Comment to message** (Instagram): add the keyword `SAT`. In posts, write
   "Comment SAT and we'll send you a free lesson link." Reply text: the same as the instant reply.
5. **Away message**: turn on for your night hours, with the same link.

Meta only lets a business message someone for 24 hours after their last message, so the
goal of every reply is to get them onto the site, where email takes over.

## Links to use

| Where | Link |
|-------|------|
| Instagram bio | `https://pispark.site/?utm_source=instagram&utm_medium=bio` |
| Facebook Page button | `https://pispark.site/?utm_source=facebook&utm_medium=page` |
| In a DM | `https://pispark.site/book_a_lesson?utm_source=instagram&utm_medium=dm` |
| In an ad, later | `https://pispark.site/book_a_lesson?utm_source=meta&utm_medium=paid&utm_campaign=NAME` |

The part after `?` is how each lead records where it came from. You see it on every lead.

## Still to do

- **Video call link.** Create one reusable Google Meet link (meet.google.com → New meeting →
  Create a meeting for later) and send it over. Until then, confirmations say the link will
  follow, and you send it by hand.
- **Change the owner password.** It was typed into a chat. Change `ADMIN_PASSWORD` in Vercel
  (Settings → Environment Variables), then redeploy.

## What the site does not do yet

- **Text messages.** US rules make texting from a foreign business slow and paid to set up.
  Email and DMs only for now.
- **Deleting old leads.** The privacy policy promises deletion within 12 months for families
  who did not become students, and on request. For now, delete the row by hand in Supabase
  (Table editor → leads).
- **Payment.** Invoices are sent by you.

## Limits to know about

- The free email plan sends 100 emails a day. A new lead uses up to 7 (reply, alert, five
  follow-ups), a booking up to 4. That is roughly 12 new leads a day before emails start
  failing. If you get near that, upgrade Resend first. Failed emails are flagged on the lead.
- The humour ("800 factory", the stereotype line) is on the site and fine for your own posts.
  Keep it out of paid ads: Meta restricts ad copy that refers to ethnicity, and a new ad
  account is the wrong place to test that.
