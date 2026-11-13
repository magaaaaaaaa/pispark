# Owner setup

Things only you can do, once. Each takes a few minutes.

## 1. A video call link

Every confirmation email tells the family where to join the lesson. The simplest way is one
link that you reuse for every trial:

- **Google Meet:** open meet.google.com, choose "New meeting", then "Create a meeting for
  later". Copy the link. It keeps working for as long as you use it.
- **Zoom:** use your Personal Meeting Room link from your Zoom profile.

Until you add one, emails say "we will send the video call link by email before the lesson",
and you send it by hand.

## 2. Email (Resend)

1. In Resend, check that the domain `pispark.site` shows as **Verified**.
2. Create an API key (API Keys → Create). Copy it once; it is shown only once.
3. Do not paste the key into a chat. Put it straight into Vercel (step 4).

## 3. A password for your private page

Pick a long password (four or more random words is fine). You will use it at
`pispark.site/owner`.

## 4. Settings in Vercel

In the Vercel project, open Settings → Environment Variables and add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | the key from step 2 |
| `OWNER_EMAIL` | the address where you want new-lead emails |
| `TRIAL_CALL_URL` | the link from step 1 |
| `ADMIN_PASSWORD` | the password from step 3 |

The database settings and the session secret are added for you during deployment.

## 5. Point the domain at the site

Vercel shows one or two DNS records for `pispark.site`. Add them where you bought the domain,
next to the Resend records you already added. Do not delete the Resend records.

## 6. Instagram bio link

Set the link in your Instagram bio to:

```
https://pispark.site/?utm_source=instagram&utm_medium=bio
```

and on Facebook:

```
https://pispark.site/?utm_source=facebook&utm_medium=page
```

The extra part after `?` is how each booking records where it came from.

## Your weekly routine

- A new booking arrives by email with everything you need to prepare.
- After the trial, open the lead at `pispark.site/owner`, write three or four lines about what
  you saw, and press "Send offer". The family gets your notes and the $17/hour offer.
- When they pay, set the stage to "Paying". If they decline, "Not now" or "Lost".

## Text to replace on the site

The "Who teaches" section on the home page is written generically. Send a short bio (your
background, SAT score or teaching experience, a photo if you like) and it will be replaced.
