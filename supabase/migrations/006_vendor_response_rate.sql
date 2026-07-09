-- Game Plan HTX — 006_vendor_response_rate.sql
-- Turns vendors.response_rate into a real computed metric: the
-- vendor's average first-reply time (in hours) across conversations
-- where a planner sent an inquiry in the last 90 days. Populated
-- hourly by the compute-vendor-response-rate Edge Function
-- (service-role writes only — response_rate is already guarded by
-- protect_vendor_columns, see 002/005).
-- Run AFTER 005_vendor_pricing_and_verification.sql.

-- Widen precision: numeric(5,2) tops out at 999.99 hours (~42 days).
-- A conversation just inside the 90-day inquiry window can still get
-- a reply well past that, so widen headroom for the average.
alter table public.vendors
  alter column response_rate type numeric(7,2);

-- response_rate defaulted to 0 for every vendor even though nothing
-- ever computed it ("currently isn't computed from anything"). Drop
-- the default and null out existing zeros so "no reply data yet"
-- doesn't read as "replies instantly" until the function runs.
alter table public.vendors
  alter column response_rate drop default;

update public.vendors
  set response_rate = null
  where response_rate = 0;

-- ============================================================
-- Hourly schedule: pg_cron invokes the compute-vendor-response-rate
-- Edge Function over HTTP via pg_net.
--
-- One-time manual setup required (NOT done here — do not hardcode
-- secrets in a migration file checked into git). Run once in the
-- Supabase SQL editor:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service-role-key>', 'service_role_key');
--
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'compute-vendor-response-rate-hourly',
    '0 * * * *',
    $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
        || '/functions/v1/compute-vendor-response-rate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body := '{}'::jsonb
    );
    $$
  );
