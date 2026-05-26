-- ════════════════════════════════════════════════════════════════════════════
-- 027_water_module.sql
-- Creates the water-tanker module tables (`water_vendors`, `water_records`)
-- used by the .NET WaterController + the admin "Record tanker water" form.
--
-- The original schema for these tables lives in supabase/migrations/001_init.sql,
-- but if your Supabase database was provisioned before that migration was run
-- (or if 001_init was skipped/partial), this file gives you a self-contained
-- way to bring the water module online without touching anything else.
--
-- Safe to run more than once: every statement is guarded with IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_vendors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  contact_number  text,
  address         text,
  vehicle_no      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_vendors_vehicle_no_idx
  ON public.water_vendors (vehicle_no);

CREATE TABLE IF NOT EXISTS public.water_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL,
  source          text,
  source_type     text,
  vehicle_no      text,
  opening_meter   text,
  closing_meter   text,
  tds             text,
  load            text,
  tank_level_kl   numeric,
  vendor_id       uuid REFERENCES public.water_vendors(id) ON DELETE SET NULL,
  notes           text,
  receipt_url     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Intentionally no FK on created_by — keeps the column compatible with the
  -- pre-existing 001_init.sql schema (which references profiles(id)) without
  -- failing on Supabase projects where the auth schema is set up differently.
  -- The WaterController writes NULL today; future versions can wire in the
  -- authenticated user id.
  created_by      uuid
);

CREATE INDEX IF NOT EXISTS water_records_date_idx
  ON public.water_records (date DESC);
CREATE INDEX IF NOT EXISTS water_records_vendor_id_idx
  ON public.water_records (vendor_id);
CREATE INDEX IF NOT EXISTS water_records_created_at_idx
  ON public.water_records (created_at DESC);

-- ── Seed: a few demo tanker vendors ─────────────────────────────────────────
-- These mirror what the React admin dashboard was previously holding in local
-- state (`v-001`/`v-002`/`v-003`). After this migration runs, the frontend's
-- `openWaterRecordForm` will fetch real UUIDs from /api/water/vendors and use
-- those for the FK on POST /api/water/records.

INSERT INTO public.water_vendors (name, contact_number, address, vehicle_no)
SELECT 'SwS water tanker', '9876543210', 'KR Puram, Bengaluru', 'KA53JR1035'
WHERE NOT EXISTS (
  SELECT 1 FROM public.water_vendors WHERE vehicle_no = 'KA53JR1035'
);

INSERT INTO public.water_vendors (name, contact_number, address, vehicle_no)
SELECT 'BlueLine Tankers', '9123456789', 'Whitefield, Bengaluru', 'KA01AB1234'
WHERE NOT EXISTS (
  SELECT 1 FROM public.water_vendors WHERE vehicle_no = 'KA01AB1234'
);

INSERT INTO public.water_vendors (name, contact_number, address, vehicle_no)
SELECT 'City Water Supply', '9988776655', 'Indiranagar, Bengaluru', 'KA03CD9012'
WHERE NOT EXISTS (
  SELECT 1 FROM public.water_vendors WHERE vehicle_no = 'KA03CD9012'
);

-- ════════════════════════════════════════════════════════════════════════════
-- Done.  Verify with:
--   SELECT count(*) FROM public.water_vendors;   -- should be ≥ 3
--   SELECT count(*) FROM public.water_records;   -- should be 0 on a fresh DB
-- ════════════════════════════════════════════════════════════════════════════
