-- Enable Supabase Realtime (postgres_changes) for messages so open
-- conversation threads receive new messages live. RLS on messages
-- ensures subscribers only receive rows for conversations they
-- participate in.
alter publication supabase_realtime add table public.messages;

-- Realtime RLS checks need old-row data for updates; full replica
-- identity keeps read-receipt updates deliverable too if subscribed.
alter table public.messages replica identity full;
