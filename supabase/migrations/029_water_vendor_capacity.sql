-- ════════════════════════════════════════════════════════════════════════════
-- 029_water_vendor_capacity.sql
-- Adds the declared tanker capacity (in kilolitres) to each vendor so we can
-- bill / audit against:
--   • Declared KL    = loads × tanker_capacity_kl   (what the vendor charges)
--   • Measured KL    = closing_meter − opening_meter (what we actually got)
--   • Declared cost  = Declared KL × ₹130           (₹0.13 per litre)
--   • Measured cost  = Measured KL × ₹130
--
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.water_vendors
  ADD COLUMN IF NOT EXISTS tanker_capacity_kl numeric NOT NULL DEFAULT 6;

-- Seed sensible capacities for the demo vendors so the cost summary is non-zero
-- the moment this migration lands.  Only updates rows that are still at the
-- default 6 KL so we don't clobber values an admin has already customised.
UPDATE public.water_vendors
SET tanker_capacity_kl = CASE
  WHEN LOWER(name) LIKE '%sws%'        THEN 12
  WHEN LOWER(name) LIKE '%bwssb%'      THEN  9
  WHEN LOWER(name) LIKE '%blueline%'   THEN 16
  WHEN LOWER(name) LIKE '%city water%' THEN  6
  ELSE tanker_capacity_kl
END
WHERE tanker_capacity_kl = 6;

-- ════════════════════════════════════════════════════════════════════════════
-- Verify:
--   SELECT name, vehicle_no, tanker_capacity_kl FROM public.water_vendors;
-- ════════════════════════════════════════════════════════════════════════════
