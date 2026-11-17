# Content playbook

Instructions for whoever writes the week's posts, human or AI. The owner approves every
post before it is published, but treat your draft as if it were going out unread.

## What a week is

Five posts, Monday to Friday, one a day. Dates are US Eastern calendar dates.

| Day | Kind | Purpose |
|-----|------|---------|
| Mon | `question` | One SAT-style question with a worked solution. Shows how we teach. |
| Tue | `mistake` | A common slip and how to avoid it. |
| Wed | `strategy` | A technique or a Desmos calculator trick. |
| Thu | `parent` | Planning, timelines, how prep works. Speaks to the person who pays. |
| Fri | `challenge` | A harder question than Monday's. |

In the two weeks before an SAT test date or a registration deadline, the Thursday post may
be a countdown or planning post about that date. **Look the dates up on College Board's
dates and deadlines page every time. Never write a date from memory.**

## Topics

Rotate across the four digital SAT math areas so the same topic does not return within
three weeks. Before writing, list the last 15 posts' `topic` values and avoid them.

- **Algebra:** linear equations and inequalities, systems, linear functions, slope.
- **Advanced math:** quadratics, exponentials, polynomials, rational and radical equations,
  function notation.
- **Problem-solving and data analysis:** ratios, rates, percentages, units, mean and median,
  probability, reading tables and scatterplots (describe the data in words; slides have no
  charts).
- **Geometry and trigonometry:** area and volume, lines and angles, triangles, circles,
  right-triangle trigonometry.

## Learn from how the last weeks went

Before writing, look at how earlier posts did. The site refreshes likes, comments and shares
for every post daily for three weeks after it goes out.

```sql
select scheduled_for, kind, topic,
       coalesce(ig_likes, 0) + 2 * coalesce(ig_comments, 0)
         + coalesce(fb_reactions, 0) + 2 * coalesce(fb_comments, 0) + 3 * coalesce(fb_shares, 0) as score,
       ig_likes, ig_comments, fb_reactions, fb_comments, fb_shares
from public.posts
where status = 'published' and published_at > now() - interval '42 days'
order by scheduled_for;
```

And which channels brought sign-ups, per week:

```sql
select date_trunc('week', created_at)::date as week, utm_source, utm_medium, count(*)
from public.leads
where created_at > now() - interval '42 days'
group by 1, 2, 3 order by 1;
```

How to use it:

- **Comments and shares count more than likes**: they mean someone engaged or passed it on.
- **Change one thing a week, and keep the five-day shape.** Weekdays keep their kind. What can
  move: which topic area gets more posts, the difficulty of Monday's and Friday's questions,
  the style of the first slide (question first, or a mistake first), and the caption's
  opening line and call to action.
- **Do not read anything into fewer than two weeks of posts** or a difference of a few likes.
  Until there are 10 published posts, keep the default mix and say so.
- **A sign-up beats any number of likes.** If a week brought sign-ups from Instagram or
  Facebook, keep what that week did and say what it was.
- In `check_note` of the Monday post, add one line starting `Learning:` that says what you
  kept, what you changed this week and why, citing the numbers. The owner sees it on the
  approval page.

## Rules that are not negotiable

1. **Every answer is verified by computing it.** Solve each question with code (for example
   `sympy`), not by reading it over. Write what you ran and what it returned in `check_note`.
   If the computed answer differs from yours, the post is wrong: fix it or drop it.
2. **Every question is original.** Never copy or lightly reword a real College Board
   question. Write in the style of the digital SAT.
3. **Multiple choice has exactly four choices, one correct.** Check that the three wrong
   choices are actually wrong, and that each is a mistake a student could plausibly make.
4. **No promises.** No "guarantee", no number of points, no claim to be official material.
5. **No ethnicity, age or "you are struggling" framing.** The school's own joke about the
   stereotype lives on the website; it stays out of posts, because posts become ads.
6. **Plain language.** A 15-year-old and their parent should both follow it. Short sentences.
7. **Every post ends with the `cta` slide**, and every caption includes "link in bio".
8. **At most five hashtags** (Instagram's cap since December 2025): `#SAT #SATmath #digitalSAT
   #SATprep` plus one for the topic.
9. **American English.** Math, never "maths". The audience is in the US.
10. **Run every caption through the Instagram tools before saving** (see "Captions" below).

## Captions

The `ig-*` skills in `.claude/skills/` are installed for this (see
`.claude/skills/IG-AGENT-SOURCE.md`). The account's voice is `docs/instagram-voice.md`;
copy it to `~/.claude/instagram/voice.md` first. For each caption:

1. Save it to a text file and run
   `python3 -I .claude/skills/ig-caption/caption.py FILE --keywords "SAT math,digital SAT"`.
   No FAIL is allowed. The first line must land whole inside the 125 characters the feed
   shows, and "SAT math" or "digital SAT" must appear inside that window.
2. Run `python3 -I .claude/skills/ig-human/humanize.py FILE --report`, keep its fixes where
   they are right, rewrite anything it flags, then `detect.py FILE` must say PASS.
3. Put the caption back into the post. Slides follow the same plain-language rules.

## The format

A post is one row in the `posts` table. `slides` is a JSON array of 2 to 6 slides. Each
slide has an optional `title` (up to 70 characters) and 1 to 5 `blocks`:

| Block | Fields | Use |
|-------|--------|-----|
| `text` | `text` (≤ 320) | A sentence or two. |
| `math` | `text` (≤ 60) | One line of maths, set large. One equation per block. |
| `choices` | `items` (exactly 4, each ≤ 40) | Answer choices; the letters A–D are added for you. |
| `steps` | `items` (1–5, each ≤ 160) | A numbered worked solution or list. |
| `answer` | `text` (≤ 60) | The final answer, highlighted. For multiple choice write `C) 5`. |
| `cta` | none | The closing free-lesson slide. Always the only block on the last slide. |

Write maths with real symbols: `−` (not a hyphen) for minus, `×`, `÷`, `²`, `³`, `√`, `≤`,
`≥`, `≠`, `π`, `°`, `·`. Fractions are written inline, `(x + 1)/2`. Only these symbols and
ordinary keyboard characters can be drawn; anything else is rejected.

A slide holds roughly 20 lines of text. Keep slides light: one idea each. The first slide
is the cover and should work on its own in a feed.

`content/examples/` holds complete weeks that pass every rule. Imitate their shape and
tone, not their topics. `npm test` checks every file there against the rules.

## Adding a week to the queue

Insert five rows with `status` left at its default (`draft`):

```sql
insert into public.posts (scheduled_for, kind, topic, slides, caption, check_note)
values ('2026-11-23', 'question', 'Linear inequalities', '[...]'::jsonb, '...', 'Solved with sympy: ...');
```

Before inserting, save the week as `content/examples/week-YYYY-MM-DD.json` (same shape as
the existing file) and run `npm test`: it fails if any post breaks a rule. Do not insert a
week that fails. The owner is emailed automatically when new drafts appear and approves
them at `/owner/posts`.

Never set `status` to `approved` yourself, and never change a row that is not a draft.
