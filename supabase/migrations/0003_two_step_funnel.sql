-- The funnel now saves a lead from a first name and an email; the rest is optional.
alter table public.leads alter column student_name drop not null;
alter table public.leads alter column grade drop not null;
alter table public.leads alter column role set default 'parent';

-- Ids of scheduled follow-up nudges, so they stop when the family books or unsubscribes.
alter table public.leads add column followup_ids text[] not null default '{}';
alter table public.leads add column unsubscribed_at timestamptz;
