-- When a post was claimed for publishing, so an interrupted run can be noticed.
alter table public.posts add column claimed_at timestamptz;
-- Fingerprint of the exact content the owner approved. A post whose content no
-- longer matches it is never published.
alter table public.posts add column approved_hash text;
