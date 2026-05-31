-- ════════════════════════════════════════════════════════════════════════════
-- 030_water_vendor_vehicles.sql
-- Multiple registration numbers per tanker vendor; plates can be added,
-- retired (is_active = false), and replaced without losing history.
-- Migrates legacy water_vendors.vehicle_no into the new table.
--
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Move any legacy single plate from water_vendors into the fleet table.
INSERT INTO public.water_vendor_vehicles (vendor_id, vehicle_no, is_active)
SELECT
  v.id,
  upper(regexp_replace(trim(v.vehicle_no), '[\s\-]+', '', 'g')),
  true
FROM public.water_vendors v
WHERE v.vehicle_no IS NOT NULL
  AND trim(v.vehicle_no) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.water_vendor_vehicles wvv
    WHERE wvv.vendor_id = v.id
      AND wvv.vehicle_no = upper(regexp_replace(trim(v.vehicle_no), '[\s\-]+', '', 'g'))
  );

COMMENT ON COLUMN public.water_vendors.vehicle_no IS
  'Deprecated — use water_vendor_vehicles. Kept for backward compatibility only.';

-- ════════════════════════════════════════════════════════════════════════════
-- Verify:
--   SELECT v.name, wvv.vehicle_no, wvv.is_active
--   FROM water_vendors v
--   LEFT JOIN water_vendor_vehicles wvv ON wvv.vendor_id = v.id
--   ORDER BY v.name, wvv.vehicle_no;
-- ════════════════════════════════════════════════════════════════════════════
