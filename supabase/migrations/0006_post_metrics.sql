-- How each published post did, refreshed daily for three weeks after it goes out,
-- so next week's posts can be written from what worked.
alter table public.posts add column ig_likes integer;
alter table public.posts add column ig_comments integer;
alter table public.posts add column fb_reactions integer;
alter table public.posts add column fb_comments integer;
alter table public.posts add column fb_shares integer;
alter table public.posts add column metrics_at timestamptz;
