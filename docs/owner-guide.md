# Owner guide

## How a lead moves

1. Someone leaves a first name and an email on `pispark.site` (or `pispark.site/book_a_lesson`).
   The lead is saved at that moment.
2. They get an email straight away with three times to tap, and you get a "New lead" email.
3. They pick a time on the site or from the email. You get a "Trial booked" email with a
   calendar file. They get a confirmation and two reminders.
4. If they do not pick a time, they get five short emails over two weeks (days 1, 3, 6, 10
   and 14), sent once a day at about 6 pm US Eastern. These stop when they book, unsubscribe,
   or you move the lead to any other stage.
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
   - "How much is it?" → "The first 25-minute lesson is free. After that, plans start at $139 per 4 weeks for a fixed weekly 1-on-1 lesson, cancel any time. All plans: pispark.site"
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

## Leads marked "check by hand"

A sign-up that looks automated (it filled a hidden field, or many came from one connection in
an hour) is still saved, but gets no emails. It shows a yellow "check by hand" mark in your
list. If the name and email look real, write to them yourself.

## Posts: your weekly routine

1. Once a week you get an email: "new posts to approve".
2. Open `pispark.site/owner/posts`. Each post shows its slides exactly as they will appear,
   the caption (you can edit it), and a note on how the answer was checked.
3. Read each one. Press **Approve**, or **Approve all drafts**. Press **Reject** for any
   you do not want.
4. One approved post goes out each day in the early evening, US Eastern time, to Instagram
   and Facebook. If you approve nothing, nothing is published, and you get an email saying so.
5. If a post was changed after you approved it, it is not published: it comes back to you
   as a draft to approve again.

Until Instagram and Facebook are connected (next section), approved posts simply wait. You
can still tap any slide to download it and post by hand.

## Connect Instagram and Facebook (once, about 15 minutes)

You never give anyone your password. You create a key (an "access token") that lets this site
post to the PiSpark Math Page and @pispark.math, and nothing else.

Use a **system user** in Meta Business Suite. It is a robot account that belongs to your
business, not to your personal Facebook profile, so its key does not break when you log out,
change your password, pass a security check, or generate another token somewhere else. Keys
made in the Graph API Explorer are tied to your personal login and break for all of those.

Meta renames these screens often; the goal of each step is what matters.

1. **business.facebook.com → Settings** (business portfolio settings).
2. **Accounts → Pages**: PiSpark Math must be listed. If not: Add → add a Page you own.
   **Accounts → Instagram accounts**: @pispark.math must be listed. If not, connect it.
3. **Accounts → Apps → Add → Connect an app ID**: enter the App ID of *PiSpark Poster*
   (developers.facebook.com → My apps → PiSpark Poster → the number under its name).
4. **Users → System users → Add**: name `PiSpark poster`, role **Admin**.
5. Select the new system user → **Assign assets**:
   - Pages → PiSpark Math → turn on full control.
   - Instagram accounts → @pispark.math → full control.
   - Apps → PiSpark Poster → full control.
6. Still on the system user → **Generate new token**:
   - App: PiSpark Poster. Expiration: **Never**.
   - Permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
     `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`,
     `business_management`.
   - Generate, and copy the token straight away: Meta shows it only once.
7. **Vercel** → `pispark` → Settings → Environment Variables → edit `META_PAGE_TOKEN`, paste the
   token, save. Then Deployments → the latest one → **Redeploy**, and wait until it says Ready.
8. Open `pispark.site/owner/posts` → **Test Instagram and Facebook connection**. It should say
   *Connected to the Facebook Page "PiSpark Math" and its Instagram account.*

You can paste the system user token as it is: the site finds the PiSpark Math Page and its own
Page token by itself. (A Page token made the old way also still works.)

Do not paste the token into a chat or an email. If it ever leaks, remove the app under
Facebook → Settings → Business integrations, and make a new token.

If a post fails to publish, you get an email saying why, and the post shows a
**Try again** button. If the email says the token lost its access, make a new token for the
same system user (step 6) and save it in Vercel (step 7).

## Still to do

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

- The free email plan sends 100 emails a day. A new lead uses 2 at once (reply and your
  alert) and up to 5 more over two weeks; a booking uses 4. That is comfortable up to
  roughly 15 new leads a day. If you get near that, upgrade Resend first. Failed emails are flagged on the lead.
- The humour (the stereotype line) is on the site and fine for your own posts. "800 factory" is no longer the headline; use it in posts if you like, but never as a promise.
  Keep it out of paid ads: Meta restricts ad copy that refers to ethnicity, and a new ad
  account is the wrong place to test that.
