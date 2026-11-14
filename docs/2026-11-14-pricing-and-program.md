# PiSpark: prices, plans and how studying works

Written 14 Nov 2026. Replaces "$17 an hour, in packs of 8". Nothing on the site has changed yet;
see "What changes on the site" at the end.

## Why change

- **$17 an hour reads as "too cheap to be good".** US parents compare it with what they know:
  SAT tutors average about **$62 an hour** (Wiingy, 3,600 tutors, Sept 2025), large prep companies
  sell 1-on-1 at about **$150–$249 an hour**, and graduate-student tutors charge **$45–$80**.
  At $17 the honest reason ("we are new and in Kazakhstan") has to fight the first impression.
- **An hourly price makes parents count hours.** A monthly plan makes them think about the result
  (a score by a test date) and gives you steady, predictable income.
- **An hourly price says nothing about when lessons happen.** A plan comes with a fixed weekly time,
  so the schedule is part of what they buy, not a separate negotiation.

## The offer, in one line

> A fixed weekly 1-on-1 SAT math lesson with the same teacher, homework between lessons, a practice
> test every 4 weeks and a progress report to the parent. Paid every 4 weeks, cancel any time.

## Plans

All lessons are 60 minutes, live, 1-on-1, online. Prices are per 4 weeks, paid in advance.

| Plan | What's in it | Founding price | Regular price | Works out to |
|---|---|---|---|---|
| **Weekly** | 1 lesson a week (4 lessons) | **$139** | $179 | ~$35 a lesson |
| **Twice a week** | 2 lessons a week (8 lessons) | **$259** | $339 | ~$32 a lesson |
| **Test Sprint** | 8 weeks before one SAT date: 2 lessons a week (16), 2 full practice tests reviewed, a test-day plan | **$499** once (or 2 × $259) | $649 | ~$31 a lesson |

- **Free first lesson stays** (25 minutes). It is now also the placement check (see below).
- **Founding price** is for the first 10 paying families and stays locked as long as they keep
  their plan without a break of more than 4 weeks. After 10, new families pay the regular price.
  This is the honest version of "we are new": a real discount from a real price.
- Still roughly half a typical tutor's rate, so "good value" survives; it just no longer looks
  suspicious.
- **Which plan to recommend:** more than 12 weeks to the test → Weekly; 8–12 weeks, or a gap of
  more than 100 points to the goal → Twice a week; a family set on one specific date → Test Sprint.

### Next SAT dates (College Board, checked 14 Nov 2026)

| Test | Register by | Sprint would start |
|---|---|---|
| 5 Dec 2026 | 20 Nov | too close; no Sprint |
| 6 Mar 2027 | 19 Feb | about 9 Jan |
| 1 May 2027 | 16 Apr | about 6 Mar |
| 5 Jun 2027 | 21 May | about 10 Apr |

The best thing to sell right now: **start in late November / December on Weekly, aim for 6 March.**

## When lessons happen

- **Each family gets a fixed weekly time** (two for Twice a week and Sprint), chosen right after the
  free lesson. The same time every week. This is what they are paying to hold.
- Times come from the existing windows (Astana time, shown to families in their own time):
  - Tue–Sat 05:00–10:00 = **US weekday evenings** (Mon–Fri)
  - Sat–Sun 19:00–23:00 = **US weekend mornings**
- Capacity: decide how many hours a week you want to teach; each Weekly family takes 1, each
  Twice/Sprint family takes 2. When full, new families go on a waiting list (the price holds).

### Rules (short, so they fit on the terms page)

1. **Moving a lesson:** with 24 hours' notice, it moves to another free time that week or the next.
   One move per 4 weeks.
2. **Late cancel or no-show:** counts as taught.
3. **If the teacher cancels:** always made up, or refunded.
4. **Pause:** up to 2 weeks per 4-week cycle (holidays, exams); the next payment date moves back.
5. **Cancel:** any time before the next payment date. Nothing more is charged; no refunds for the
   current 4 weeks except lessons the teacher cancelled. A Test Sprint stopped early: lessons not
   yet taken are refunded on request (it is one large payment up front).
6. Unused lessons do not roll over past the end of the next cycle.

## How studying works

### Start (week 0)

1. **Free 25-minute lesson** = placement: 6–8 SAT questions across the four areas, a short talk about
   the goal score and test date. At the end, recommend one plan and book the weekly time.
2. **First homework:** the math sections of a full official practice test in **Bluebook** (College
   Board's free app, the same one used on test day). Its score report shows the weak areas.

### What the test covers (digital SAT math)

Two 35-minute modules, 22 questions each; the second module adapts to the first. Desmos is built in.

| Area | Share of questions | Order taught (default) |
|---|---|---|
| Algebra | ~35% | 1st |
| Advanced Math | ~35% | 2nd |
| Problem-Solving and Data Analysis | ~15% | 3rd |
| Geometry and Trigonometry | ~15% | 4th |

The order changes to put the student's weakest high-share area first.

### Each 60-minute lesson

| Minutes | What |
|---|---|
| 0–10 | Go through the homework mistakes |
| 10–40 | One topic: explain, worked examples, the Desmos shortcut where one exists |
| 40–55 | Timed mini-set of SAT-style questions (about 75 seconds each) |
| 55–60 | Set homework, write two lines in the lesson log |

**Homework:** 30–45 minutes a week from the official SAT Suite Question Bank (free), on that week's topic.

### Every 4 weeks

- **Practice test** (math sections in Bluebook) as homework, reviewed in the next lesson.
- **Parent report** by email: latest score and change, topics covered, lessons attended, the
  focus for the next 4 weeks, and the payment link for the next cycle.

### Last 2 weeks before a test

Full timed modules only, the adaptive second module, pacing and guessing strategy, a test-day
checklist (Bluebook installed and updated, device charged, admission ticket).

## How a family moves through it

1. Free lesson → recommend a plan → book the weekly time.
2. "Send offer" (already on the owner page) sends the plan, the fixed time and the payment link.
3. Payment received → lead marked "Paying" → weekly lessons start.
4. Every 4 weeks: report + payment link. No payment by the date → one reminder; still none →
   the time is released.

## What changes on the site (not done yet)

Everything reads from `lib/config.ts`, so this is one change plus wording:

- `lib/config.ts`: replace `PRICE_PER_HOUR_USD` / `PACK_SIZE` with the three plans and the
  founding-family limit.
- Home page price section and FAQ ("Why is it only $17 an hour?" → "Why is it less than most tutors?").
- `book_a_lesson` page line, terms page (plans and the rules above).
- Emails: the "$17 an hour, and why" follow-up, and the offer email (plan + weekly time).
- Slide 3 on every post: "Then $17 an hour" → "Plans from $139 a month".
- Owner page: lead shows chosen plan, weekly time and next payment date.

Payment collection is still by invoice; online payment is a separate step.

## Sources

- Wiingy tutor-rate study, Sept 2025: https://www.globenewswire.com/news-release/2025/09/30/3158961/0/en/sat-prep-tutoring-costs-63-more-than-language-learning-wiingy-study-finds.html
- SAT tutoring cost guides: https://www.ivystrides.com/blog/sat-act-tutoring-cost/ ,
  https://tutorcruncher.com/blog/average-test-prep-tutoring-rates ,
  https://yourdreamschool.com/?p=99259
- Package prices of large companies: https://testprepinsight.com/best/best-sat-tutoring ,
  https://historycooperative.org/prepscholar-sat-review/
- SAT dates: https://satsuite.collegeboard.org/sat/dates-deadlines
