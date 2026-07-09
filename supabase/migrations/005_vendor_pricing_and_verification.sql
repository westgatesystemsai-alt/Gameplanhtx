-- Game Plan HTX — 005_vendor_pricing_and_verification.sql
-- Adds Transparent Pricing (price_range_min/max) and the Gameplan
-- Verified checklist (verified_items) to vendors. Run AFTER
-- 004_fix_reviews_policy.sql.

alter table public.vendors
  add column price_range_min integer,
  add column price_range_max integer,
  add column verified_items jsonb not null default
    '{"insurance": false, "license": false, "portfolio": false, "standards": false}'::jsonb;

alter table public.vendors
  add constraint vendors_price_range_check
  check (
    price_range_min is null or price_range_max is null or price_range_min <= price_range_max
  );

-- verified_items joins the existing set of admin/server-only vendor
-- fields — a vendor must never be able to mark itself Gameplan
-- Verified. price_range_min/max are intentionally NOT added here:
-- vendors set their own starting price via "vendors: owner update".
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
    or new.verified_items      is distinct from old.verified_items
  ) then
    raise exception 'Protected vendor fields can only be changed by admin or server';
  end if;
  return new;
end;
$$;
