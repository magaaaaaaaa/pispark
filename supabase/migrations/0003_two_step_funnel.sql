-- The funnel now saves a lead from a first name and an email; the rest is optional.
alter table public.leads alter column student_name drop not null;
alter table public.leads alter column grade drop not null;
alter table public.leads alter column role set default 'parent';

-- Follow-up nudges are sent by a daily job that checks the lead's state at send time.
alter table public.leads add column followups_sent integer not null default 0;
alter table public.leads add column unsubscribed_at timestamptz;

-- Sign-ups we saved but did not email (hidden-field hit, or too many from one address),
-- so the owner can check them by hand instead of losing them.
alter table public.leads add column flagged text;

-- One open, unbooked lead per email: two tabs submitting at once cannot create two.
create unique index leads_one_new_per_email on public.leads (email)
  where stage = 'new' and flagged is null;
