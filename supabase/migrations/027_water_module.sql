-- ════════════════════════════════════════════════════════════════════════════
-- 027_water_module.sql
-- Water tanker module: vendors, fleet plates (0–N per vendor), delivery records.
-- Used by WaterController + admin "Record tanker water" form.
--
-- Plates live in water_vendor_vehicles (not on the vendor row) so a supplier can
-- run multiple tankers or change numbers without losing history.
--
-- Safe to re-run: IF NOT EXISTS / conditional inserts.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Vendors (no vehicle_no — see water_vendor_vehicles) ─────────────────────

CREATE TABLE IF NOT EXISTS public.water_vendors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  contact_number  text,
  address         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Legacy column on databases created from 001_init or older 027 copies.
ALTER TABLE public.water_vendors
  ADD COLUMN IF NOT EXISTS vehicle_no text;

-- ── Fleet plates (many per vendor) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.water_vendor_vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       uuid NOT NULL REFERENCES public.water_vendors(id) ON DELETE CASCADE,
  vehicle_no      text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS water_vendor_vehicles_vendor_plate_uidx
  ON public.water_vendor_vehicles (vendor_id, vehicle_no);

CREATE INDEX IF NOT EXISTS water_vendor_vehicles_vendor_active_idx
  ON public.water_vendor_vehicles (vendor_id)
  WHERE is_active;

CREATE INDEX IF NOT EXISTS water_vendor_vehicles_plate_idx
  ON public.water_vendor_vehicles (vehicle_no);

-- ── Delivery records (vehicle_no = plate used on that trip) ─────────────────

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
  created_by      uuid
);

CREATE INDEX IF NOT EXISTS water_records_date_idx
  ON public.water_records (date DESC);
CREATE INDEX IF NOT EXISTS water_records_vendor_id_idx
  ON public.water_records (vendor_id);
CREATE INDEX IF NOT EXISTS water_records_created_at_idx
  ON public.water_records (created_at DESC);
CREATE INDEX IF NOT EXISTS water_records_vehicle_no_idx
  ON public.water_records (vehicle_no);

-- ── Seed vendors + sample fleets ────────────────────────────────────────────

INSERT INTO public.water_vendors (name, contact_number, address)
SELECT 'SwS water tanker', '9876543210', 'KR Puram, Bengaluru'
WHERE NOT EXISTS (SELECT 1 FROM public.water_vendors WHERE lower(name) = lower('SwS water tanker'));

INSERT INTO public.water_vendors (name, contact_number, address)
SELECT 'BlueLine Tankers', '9123456789', 'Whitefield, Bengaluru'
WHERE NOT EXISTS (SELECT 1 FROM public.water_vendors WHERE lower(name) = lower('BlueLine Tankers'));

INSERT INTO public.water_vendors (name, contact_number, address)
SELECT 'City Water Supply', '9988776655', 'Indiranagar, Bengaluru'
WHERE NOT EXISTS (SELECT 1 FROM public.water_vendors WHERE lower(name) = lower('City Water Supply'));

INSERT INTO public.water_vendors (name, contact_number, address)
SELECT 'Bwssb water tanker', '9000000001', 'Bengaluru'
WHERE NOT EXISTS (SELECT 1 FROM public.water_vendors WHERE lower(name) = lower('Bwssb water tanker'));

-- SwS: two active plates (common for large suppliers)
INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no)
SELECT v.id, 'KA53JR1035'
FROM public.water_vendors v
WHERE lower(v.name) = lower('SwS water tanker')
  AND NOT EXISTS (
    SELECT 1 FROM public.water_vendor_vehicles w
    WHERE w.vendor_id = v.id AND w.vehicle_no = 'KA53JR1035'
  );

INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no)
SELECT v.id, 'KA19AC4789'
FROM public.water_vendors v
WHERE lower(v.name) = lower('SwS water tanker')
  AND NOT EXISTS (
    SELECT 1 FROM public.water_vendor_vehicles w
    WHERE w.vendor_id = v.id AND w.vehicle_no = 'KA19AC4789'
  );

-- BlueLine: two plates
INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no)
SELECT v.id, 'KA01AB1234'
FROM public.water_vendors v
WHERE lower(v.name) = lower('BlueLine Tankers')
  AND NOT EXISTS (
    SELECT 1 FROM public.water_vendor_vehicles w
    WHERE w.vendor_id = v.id AND w.vehicle_no = 'KA01AB1234'
  );

INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no)
SELECT v.id, 'KA01CD5678'
FROM public.water_vendors v
WHERE lower(v.name) = lower('BlueLine Tankers')
  AND NOT EXISTS (
    SELECT 1 FROM public.water_vendor_vehicles w
    WHERE w.vendor_id = v.id AND w.vehicle_no = 'KA01CD5678'
  );

-- Bwssb: one plate
INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no)
SELECT v.id, 'KA19AC4789'
FROM public.water_vendors v
WHERE lower(v.name) = lower('Bwssb water tanker')
  AND NOT EXISTS (
    SELECT 1 FROM public.water_vendor_vehicles w
    WHERE w.vendor_id = v.id AND w.vehicle_no = 'KA19AC4789'
  );

-- City Water Supply: vendor only — add plates later via admin / API

-- Migrate any legacy single plate still on water_vendors.vehicle_no
INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no)
SELECT
  v.id,
  upper(regexp_replace(trim(v.vehicle_no), '[\s\-]+', '', 'g'))
FROM public.water_vendors v
WHERE v.vehicle_no IS NOT NULL
  AND trim(v.vehicle_no) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.water_vendor_vehicles wvv
    WHERE wvv.vendor_id = v.id
      AND wvv.vehicle_no = upper(regexp_replace(trim(v.vehicle_no), '[\s\-]+', '', 'g'))
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Verify:
--   SELECT v.name, wvv.vehicle_no FROM water_vendors v
--   LEFT JOIN water_vendor_vehicles wvv ON wvv.vendor_id = v.id ORDER BY 1, 2;
-- ════════════════════════════════════════════════════════════════════════════
