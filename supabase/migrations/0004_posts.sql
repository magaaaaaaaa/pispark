-- Social posts: generated as drafts, approved by the owner, published once a day.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- The day the post should go out, as a calendar date in US Eastern time.
  scheduled_for date not null,
  kind text not null check (kind in ('question','mistake','strategy','parent','challenge')),
  topic text not null,
  slides jsonb not null,
  caption text not null,
  status text not null default 'draft'
    check (status in ('draft','approved','publishing','published','failed','rejected')),
  -- How the answer was verified, written by whoever generated the post.
  check_note text,
  owner_notified_at timestamptz,
  published_at timestamptz,
  ig_media_id text,
  fb_post_id text,
  publish_error text
);
create index posts_status_day_idx on public.posts (status, scheduled_for);

-- Server-only access through the service role. No policies on purpose.
alter table public.posts enable row level security;
