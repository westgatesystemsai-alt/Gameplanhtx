-- Game Plan HTX — 002_rls_policies.sql
-- Enables RLS on ALL tables and defines explicit policies per
-- Build Brief Section 5. Run AFTER 001_initial_schema.sql.
--
-- Design notes:
-- * Helper functions are SECURITY DEFINER in the `private` schema
--   (not exposed via the Data API) to avoid infinite recursion when
--   policies on `profiles` need to check `profiles.role`.
-- * Roles are read from the profiles table, never from user_metadata
--   (user_metadata is client-editable and unsafe for authorization).
-- * Bookings and money-bearing fields are written ONLY by the server
--   (service role via Stripe webhook / API routes), which bypasses RLS.
--   Clients get read access only.

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- vendor row id(s) owned by the current user
create or replace function private.owns_vendor(v_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.vendors
    where id = v_id and profile_id = auth.uid()
  );
$$;

-- is the current user a participant (planner or vendor-owner) of a conversation
create or replace function private.in_conversation(c_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.conversations c
    left join public.vendors v on v.id = c.vendor_id
    where c.id = c_id
      and (c.planner_id = auth.uid() or v.profile_id = auth.uid())
  );
$$;

grant execute on function private.is_admin(), private.owns_vendor(uuid), private.in_conversation(uuid) to authenticated, anon;

-- ============================================================
-- PRIVILEGE-ESCALATION GUARDS (triggers)
-- Non-admins cannot change profiles.role, or vendors.status /
-- tier / stripe fields / computed rating fields.
-- ============================================================
-- The service role has no auth.uid(); triggers still fire for it,
-- so the guard treats "no JWT" (server-side) as trusted.
create or replace function private.is_service_or_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select auth.uid() is null or private.is_admin();
$$;

create or replace function private.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not private.is_service_or_admin() then
    raise exception 'Changing role is not allowed';
  end if;
  return new;
end;
$$;

create or replace function private.protect_vendor_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_service_or_admin() and (
       new.status              is distinct from old.status
    or new.tier                is distinct from old.tier
    or new.stripe_account_id   is distinct from old.stripe_account_id
    or new.stripe_onboarded    is distinct from old.stripe_onboarded
    or new.subscription_id     is distinct from old.subscription_id
    or new.avg_rating          is distinct from old.avg_rating
    or new.review_count        is distinct from old.review_count
    or new.response_rate       is distinct from old.response_rate
  ) then
    raise exception 'Protected vendor fields can only be changed by admin or server';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function private.protect_profile_columns();

create trigger vendors_protect_columns
  before update on public.vendors
  for each row execute function private.protect_vendor_columns();

-- ============================================================
-- ENABLE RLS ON EVERY TABLE
-- ============================================================
alter table public.profiles            enable row level security;
alter table public.vendors             enable row level security;
alter table public.categories          enable row level security;
alter table public.vendor_categories   enable row level security;
alter table public.event_types         enable row level security;
alter table public.services            enable row level security;
alter table public.portfolio_media     enable row level security;
alter table public.availability        enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.quotes              enable row level security;
alter table public.bookings            enable row level security;
alter table public.reviews             enable row level security;
alter table public.vendor_applications enable row level security;

-- ============================================================
-- profiles
-- ============================================================
create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid() or private.is_admin());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid() or private.is_admin())
  with check (id = auth.uid() or private.is_admin());
-- No INSERT policy: rows are created by the auth trigger (security definer).
-- No DELETE policy: cascades from auth.users deletion (server-managed).

-- ============================================================
-- vendors
-- ============================================================
create policy "vendors: public read approved"
  on public.vendors for select
  using (status = 'approved' or profile_id = auth.uid() or private.is_admin());

create policy "vendors: owner update"
  on public.vendors for update
  using (profile_id = auth.uid() or private.is_admin())
  with check (profile_id = auth.uid() or private.is_admin());
-- No client INSERT: vendor rows are created server-side on application approval.
-- No client DELETE.

-- ============================================================
-- categories / event_types — public read, admin write
-- ============================================================
create policy "categories: public read"
  on public.categories for select using (true);
create policy "categories: admin write"
  on public.categories for all
  using (private.is_admin()) with check (private.is_admin());

create policy "event_types: public read"
  on public.event_types for select using (true);
create policy "event_types: admin write"
  on public.event_types for all
  using (private.is_admin()) with check (private.is_admin());

-- ============================================================
-- vendor_categories — public read, vendor manages own
-- ============================================================
create policy "vendor_categories: public read"
  on public.vendor_categories for select using (true);

create policy "vendor_categories: vendor insert own"
  on public.vendor_categories for insert
  with check (private.owns_vendor(vendor_id) or private.is_admin());

create policy "vendor_categories: vendor delete own"
  on public.vendor_categories for delete
  using (private.owns_vendor(vendor_id) or private.is_admin());

-- ============================================================
-- services — public read active (of approved vendors), vendor manages own
-- ============================================================
create policy "services: public read"
  on public.services for select
  using (
    private.owns_vendor(vendor_id)
    or private.is_admin()
    or (is_active and exists (
        select 1 from public.vendors v
        where v.id = vendor_id and v.status = 'approved'))
  );

create policy "services: vendor manage own"
  on public.services for all
  using (private.owns_vendor(vendor_id) or private.is_admin())
  with check (private.owns_vendor(vendor_id) or private.is_admin());

-- ============================================================
-- portfolio_media — public read (approved vendors), vendor manages own
-- ============================================================
create policy "portfolio_media: public read"
  on public.portfolio_media for select
  using (
    private.owns_vendor(vendor_id)
    or private.is_admin()
    or exists (
        select 1 from public.vendors v
        where v.id = vendor_id and v.status = 'approved')
  );

create policy "portfolio_media: vendor manage own"
  on public.portfolio_media for all
  using (private.owns_vendor(vendor_id) or private.is_admin())
  with check (private.owns_vendor(vendor_id) or private.is_admin());

-- ============================================================
-- availability — public read (needed for date search), vendor manages own
-- ============================================================
create policy "availability: public read"
  on public.availability for select using (true);

create policy "availability: vendor manage own"
  on public.availability for all
  using (private.owns_vendor(vendor_id) or private.is_admin())
  with check (private.owns_vendor(vendor_id) or private.is_admin());

-- ============================================================
-- conversations — participants only
-- ============================================================
create policy "conversations: participants read"
  on public.conversations for select
  using (
    planner_id = auth.uid()
    or private.owns_vendor(vendor_id)
    or private.is_admin()
  );

create policy "conversations: planner create"
  on public.conversations for insert
  with check (
    planner_id = auth.uid()
    and exists (select 1 from public.vendors v
                where v.id = vendor_id and v.status = 'approved')
  );

create policy "conversations: participants update"
  on public.conversations for update
  using (planner_id = auth.uid() or private.owns_vendor(vendor_id) or private.is_admin())
  with check (planner_id = auth.uid() or private.owns_vendor(vendor_id) or private.is_admin());

-- ============================================================
-- messages — conversation participants only
-- ============================================================
create policy "messages: participants read"
  on public.messages for select
  using (private.in_conversation(conversation_id) or private.is_admin());

create policy "messages: participants send"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and private.in_conversation(conversation_id)
  );

create policy "messages: participants update (read receipts)"
  on public.messages for update
  using (private.in_conversation(conversation_id))
  with check (private.in_conversation(conversation_id));

-- ============================================================
-- quotes — vendor creates/reads in own conversations; planner reads
-- and updates status. Money fields are validated server-side; the
-- quote-accept → payment flow runs through API routes.
-- ============================================================
create policy "quotes: participants read"
  on public.quotes for select
  using (
    planner_id = auth.uid()
    or private.owns_vendor(vendor_id)
    or private.is_admin()
  );

create policy "quotes: vendor create in own conversation"
  on public.quotes for insert
  with check (
    private.owns_vendor(vendor_id)
    and private.in_conversation(conversation_id)
  );

create policy "quotes: participants update"
  on public.quotes for update
  using (
    planner_id = auth.uid()
    or private.owns_vendor(vendor_id)
    or private.is_admin()
  )
  with check (
    planner_id = auth.uid()
    or private.owns_vendor(vendor_id)
    or private.is_admin()
  );

-- Guard: planners may only change quote status (accept/decline);
-- vendors may not alter amount/fees after a quote is accepted.
create or replace function private.protect_quote_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_service_or_admin() then
    return new;
  end if;

  -- planner (non-owner of the vendor): only status may change
  if not private.owns_vendor(old.vendor_id) then
    if new.status not in ('accepted', 'declined')
       or new.amount        is distinct from old.amount
       or new.platform_fee  is distinct from old.platform_fee
       or new.vendor_payout is distinct from old.vendor_payout
       or new.event_date    is distinct from old.event_date
       or new.service_id    is distinct from old.service_id
       or new.description   is distinct from old.description
       or new.vendor_id     is distinct from old.vendor_id
       or new.planner_id    is distinct from old.planner_id
       or new.conversation_id is distinct from old.conversation_id
    then
      raise exception 'Planners may only accept or decline a quote';
    end if;
  else
    -- vendor: cannot modify a quote once it left pending
    if old.status <> 'pending' then
      raise exception 'Quote can no longer be modified';
    end if;
  end if;
  return new;
end;
$$;

create trigger quotes_protect_columns
  before update on public.quotes
  for each row execute function private.protect_quote_columns();

-- ============================================================
-- bookings — read-only for participants; created/updated ONLY by
-- the server (service role via Stripe webhook, bypasses RLS).
-- ============================================================
create policy "bookings: participants read"
  on public.bookings for select
  using (
    planner_id = auth.uid()
    or private.owns_vendor(vendor_id)
    or private.is_admin()
  );
-- No client INSERT/UPDATE/DELETE policies — intentional.

-- ============================================================
-- reviews — public read (published), planner creates one per booking
-- ============================================================
create policy "reviews: public read published"
  on public.reviews for select
  using (is_published or planner_id = auth.uid() or private.is_admin());

create policy "reviews: planner create for own paid booking"
  on public.reviews for insert
  with check (
    planner_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.planner_id = auth.uid()
        and b.vendor_id = vendor_id
        and b.payment_status = 'paid'
    )
  );
-- One review per booking enforced by UNIQUE(booking_id) in schema.
-- No client UPDATE/DELETE: vendors cannot edit; planners cannot revise
-- (spec: vendor cannot create or edit; moderation is admin/server-side).

create policy "reviews: admin manage"
  on public.reviews for update
  using (private.is_admin()) with check (private.is_admin());

create policy "reviews: admin delete"
  on public.reviews for delete
  using (private.is_admin());

-- ============================================================
-- vendor_applications — applicant reads own; admin reads/writes all
-- ============================================================
create policy "vendor_applications: applicant read own"
  on public.vendor_applications for select
  using (profile_id = auth.uid() or private.is_admin());

create policy "vendor_applications: applicant create"
  on public.vendor_applications for insert
  with check (
    profile_id = auth.uid()
    and status = 'pending'
    and admin_notes is null
    and reviewed_at is null
    and reviewed_by is null
  );

create policy "vendor_applications: admin update"
  on public.vendor_applications for update
  using (private.is_admin()) with check (private.is_admin());

create policy "vendor_applications: admin delete"
  on public.vendor_applications for delete
  using (private.is_admin());
