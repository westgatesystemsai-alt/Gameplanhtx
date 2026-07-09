-- Game Plan HTX — 007_vendor_profile_views.sql
-- Tracks public vendor-profile page loads so vendors can see, on their
-- dashboard, how much traffic their listing gets (subscription ROI).
-- Run AFTER 006_vendor_response_rate.sql.
--
-- Writes come straight from the browser (anon/authenticated Supabase
-- client) on each profile page load. Reads are scoped so a vendor only
-- ever sees rows for their own record.

create table public.vendor_profile_views (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references public.vendors(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  -- null for anonymous visitors; set null (not cascade-delete the view)
  -- if the viewer's profile is ever removed, so counts stay stable.
  viewer_id  uuid references public.profiles(id) on delete set null
);

-- The dashboard counts views per vendor over the last 30 days.
create index idx_vendor_profile_views_vendor_time
  on public.vendor_profile_views(vendor_id, viewed_at);

alter table public.vendor_profile_views enable row level security;

-- Read: a vendor can only see views of their own profile (admins see all).
create policy "vendor_profile_views: owner read"
  on public.vendor_profile_views for select
  using (private.owns_vendor(vendor_id) or private.is_admin());

-- Insert: anyone may log a view, but only against an approved vendor and
-- only as themselves (viewer_id must be null or their own uid — no
-- spoofing another user's view). No UPDATE/DELETE policies: views are
-- append-only and never edited by clients.
create policy "vendor_profile_views: log view"
  on public.vendor_profile_views for insert
  with check (
    (viewer_id is null or viewer_id = auth.uid())
    and exists (
      select 1 from public.vendors v
      where v.id = vendor_id and v.status = 'approved'
    )
  );
