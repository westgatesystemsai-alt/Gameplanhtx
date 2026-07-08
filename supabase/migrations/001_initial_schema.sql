-- Game Plan HTX — 001_initial_schema.sql
-- All tables from Build Brief Section 5, plus triggers and indexes.
-- Run BEFORE 002_rls_policies.sql.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- PRIVATE SCHEMA (security-definer helpers live here, NOT in
-- the exposed `public` schema)
-- ============================================================
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ============================================================
-- profiles — extends auth.users
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('planner', 'vendor', 'admin')),
  full_name   text,
  email       text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- vendors
-- ============================================================
create table public.vendors (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid references public.profiles(id) not null,
  business_name         text not null,
  slug                  text unique not null,
  bio                   text,
  city                  text default 'Houston',
  zip_code              text,
  website_url           text,
  instagram_url         text,
  status                text default 'pending' check (status in ('pending','approved','rejected','suspended')),
  tier                  text default 'base' check (tier in ('base','pro','premium')),
  stripe_account_id     text,
  stripe_onboarded      boolean default false,
  subscription_id       text,
  avg_rating            numeric(3,2) default 0,
  review_count          integer default 0,
  response_rate         numeric(5,2) default 0,
  profile_completeness  integer default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- categories
-- ============================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  slug        text unique not null,
  icon        text,
  description text,
  sort_order  integer default 0
);

-- ============================================================
-- vendor_categories (join)
-- ============================================================
create table public.vendor_categories (
  vendor_id   uuid references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (vendor_id, category_id)
);

-- ============================================================
-- event_types
-- ============================================================
create table public.event_types (
  id   uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null
);

-- ============================================================
-- services
-- ============================================================
create table public.services (
  id             uuid primary key default gen_random_uuid(),
  vendor_id      uuid references public.vendors(id) on delete cascade,
  title          text not null,
  description    text,
  price_type     text check (price_type in ('flat','hourly','per_person','contact')),
  price_amount   numeric(10,2),
  duration_hours numeric(4,1),
  min_guests     integer,
  max_guests     integer,
  is_active      boolean default true,
  created_at     timestamptz default now()
);

-- ============================================================
-- portfolio_media
-- ============================================================
create table public.portfolio_media (
  id            uuid primary key default gen_random_uuid(),
  vendor_id     uuid references public.vendors(id) on delete cascade,
  cloudinary_id text not null,
  url           text not null,
  thumbnail_url text,
  media_type    text check (media_type in ('image','video')),
  caption       text,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

-- ============================================================
-- availability
-- ============================================================
create table public.availability (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid references public.vendors(id) on delete cascade,
  date         date not null,
  is_available boolean default true,
  note         text,
  unique (vendor_id, date)
);

-- ============================================================
-- conversations
-- ============================================================
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  planner_id      uuid references public.profiles(id),
  vendor_id       uuid references public.vendors(id),
  status          text default 'active' check (status in ('active','archived','booked')),
  last_message_at timestamptz,
  created_at      timestamptz default now(),
  unique (planner_id, vendor_id)
);

-- ============================================================
-- messages
-- ============================================================
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id       uuid references public.profiles(id),
  body            text not null,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

-- ============================================================
-- quotes
-- ============================================================
create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id),
  vendor_id       uuid references public.vendors(id),
  planner_id      uuid references public.profiles(id),
  service_id      uuid references public.services(id),
  event_date      date not null,
  event_type      text,
  guest_count     integer,
  description     text,
  amount          numeric(10,2) not null,
  platform_fee    numeric(10,2) not null,
  vendor_payout   numeric(10,2) not null,
  status          text default 'pending' check (status in ('pending','accepted','declined','expired')),
  expires_at      timestamptz,
  created_at      timestamptz default now()
);

-- ============================================================
-- bookings
-- ============================================================
create table public.bookings (
  id                        uuid primary key default gen_random_uuid(),
  quote_id                  uuid references public.quotes(id),
  planner_id                uuid references public.profiles(id),
  vendor_id                 uuid references public.vendors(id),
  event_date                date not null,
  amount                    numeric(10,2) not null,
  platform_fee              numeric(10,2) not null,
  vendor_payout             numeric(10,2) not null,
  stripe_payment_intent_id  text,
  stripe_transfer_id        text,
  payment_status            text default 'pending' check (payment_status in ('pending','paid','refunded','disputed')),
  booking_status            text default 'confirmed' check (booking_status in ('confirmed','completed','cancelled')),
  review_requested_at       timestamptz,
  created_at                timestamptz default now()
);

-- ============================================================
-- reviews
-- ============================================================
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references public.bookings(id) unique,
  vendor_id    uuid references public.vendors(id),
  planner_id   uuid references public.profiles(id),
  rating       integer not null check (rating between 1 and 5),
  body         text,
  is_published boolean default true,
  created_at   timestamptz default now()
);

-- ============================================================
-- vendor_applications
-- ============================================================
create table public.vendor_applications (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid references public.profiles(id),
  business_name    text not null,
  category_ids     uuid[],
  bio              text,
  website_url      text,
  instagram_url    text,
  years_experience integer,
  portfolio_urls   text[],
  status           text default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes      text,
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles(id),
  created_at       timestamptz default now()
);

-- ============================================================
-- INDEXES (FKs used in policies, search filters, and lookups)
-- ============================================================
create index idx_vendors_profile_id        on public.vendors(profile_id);
create index idx_vendors_status            on public.vendors(status);
create index idx_vendor_categories_cat     on public.vendor_categories(category_id);
create index idx_services_vendor_id        on public.services(vendor_id);
create index idx_portfolio_media_vendor_id on public.portfolio_media(vendor_id);
create index idx_availability_vendor_date  on public.availability(vendor_id, date);
create index idx_conversations_planner_id  on public.conversations(planner_id);
create index idx_conversations_vendor_id   on public.conversations(vendor_id);
create index idx_messages_conversation_id  on public.messages(conversation_id);
create index idx_messages_sender_id        on public.messages(sender_id);
create index idx_quotes_conversation_id    on public.quotes(conversation_id);
create index idx_quotes_vendor_id          on public.quotes(vendor_id);
create index idx_quotes_planner_id         on public.quotes(planner_id);
create index idx_bookings_planner_id       on public.bookings(planner_id);
create index idx_bookings_vendor_id        on public.bookings(vendor_id);
create index idx_reviews_vendor_id         on public.reviews(vendor_id);
create index idx_reviews_planner_id        on public.reviews(planner_id);
create index idx_vendor_apps_profile_id    on public.vendor_applications(profile_id);
create index idx_vendor_apps_status        on public.vendor_applications(status);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function private.set_updated_at();

-- ============================================================
-- Auto-create profile on signup.
-- Role comes from signup metadata (default 'planner'); 'admin'
-- is never accepted from client metadata.
-- ============================================================
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'planner');
begin
  if requested_role not in ('planner', 'vendor') then
    requested_role := 'planner';
  end if;

  insert into public.profiles (id, role, full_name, email, avatar_url)
  values (
    new.id,
    requested_role,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
