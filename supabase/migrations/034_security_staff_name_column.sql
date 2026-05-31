-- Some databases have both name and full_name NOT NULL. EF writes name; API mirrors full_name.
-- This migration backfills name and (optionally) drops full_name after deploy uses single column.

ALTER TABLE public.security_staff ADD COLUMN IF NOT EXISTS name varchar(200);
ALTER TABLE public.security_staff ADD COLUMN IF NOT EXISTS full_name varchar(200);

UPDATE public.security_staff
SET name = full_name
WHERE (name IS NULL OR trim(name) = '')
  AND full_name IS NOT NULL
  AND trim(full_name) <> '';

UPDATE public.security_staff
SET full_name = name
WHERE (full_name IS NULL OR trim(full_name) = '')
  AND name IS NOT NULL
  AND trim(name) <> '';

-- Uncomment after API no longer maps full_name (single-column deploy):
-- ALTER TABLE public.security_staff DROP COLUMN IF EXISTS full_name;
