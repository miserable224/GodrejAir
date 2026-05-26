-- ════════════════════════════════════════════════════════════════════════════
-- 028_water_record_photos.sql
-- Persists the 4 audit photos (starting meter, ending meter, TDS, vehicle
-- plate) that accompany each row in `water_records`. The actual image bytes
-- live on the API server's static-file storage (wwwroot/uploads/water/...);
-- this table only stores the URL + LLM-extracted metadata.
--
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.water_record_photos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id         uuid NOT NULL REFERENCES public.water_records(id) ON DELETE CASCADE,
  photo_type        text NOT NULL,    -- starting_meter | ending_meter | tds | vehicle_number | unknown
  photo_url         text NOT NULL,    -- public URL (relative path like /uploads/water/2026/05/<uuid>.jpg)
  storage_path      text,             -- relative path on disk (same as URL today; future: object key)
  detected_value    text,             -- digits / plate that the LLM extracted
  scan_confidence   numeric,          -- 0.0 – 1.0
  latitude          numeric,          -- GPS lat at capture time
  longitude         numeric,          -- GPS lng at capture time
  captured_at       timestamptz,      -- when the photo was actually taken
  mime_type         text,             -- image/jpeg, image/png, image/heic, ...
  size_bytes        integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS water_record_photos_record_id_idx
  ON public.water_record_photos (record_id);
CREATE INDEX IF NOT EXISTS water_record_photos_photo_type_idx
  ON public.water_record_photos (photo_type);
CREATE INDEX IF NOT EXISTS water_record_photos_captured_at_idx
  ON public.water_record_photos (captured_at DESC);

-- ════════════════════════════════════════════════════════════════════════════
-- Verify:
--   SELECT count(*) FROM public.water_record_photos;        -- starts at 0
--   \d public.water_record_photos                            -- check columns
-- ════════════════════════════════════════════════════════════════════════════
