create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stage text not null default 'new'
    check (stage in ('new','trial_booked','trial_done','offer_sent','paying','not_now','lost')),
  role text not null check (role in ('parent','student')),
  contact_name text not null,
  student_name text not null,
  email text not null,
  parent_email text,
  grade text not null,
  test_date text,
  current_score integer,
  target_score integer,
  timezone text not null,
  trial_at timestamptz,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  owner_notes text,
  email_error text,
  ip text
);

-- One trial per slot. A lead that is lost or parked frees its slot.
create unique index leads_trial_at_unique on public.leads (trial_at)
  where trial_at is not null and stage not in ('lost','not_now');

create index leads_email_idx on public.leads (email);
create index leads_created_at_idx on public.leads (created_at desc);

-- Server-only access through the service role. No policies on purpose.
alter table public.leads enable row level security;
