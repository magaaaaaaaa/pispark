-- Ids of scheduled reminder emails, so they can be cancelled when a lead is lost or parked.
alter table public.leads add column reminder_ids text[] not null default '{}';

-- Failed owner sign-in attempts, used to lock out an address that keeps guessing.
create table public.owner_login_failures (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index owner_login_failures_ip_idx on public.owner_login_failures (ip, created_at desc);
alter table public.owner_login_failures enable row level security;
