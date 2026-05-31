-- Keep security_staff.name and full_name aligned on every write (legacy dual-column DBs).

CREATE OR REPLACE FUNCTION public.sync_security_staff_name_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS NOT NULL AND btrim(NEW.name) <> '' THEN
    NEW.full_name := btrim(NEW.name);
  ELSIF NEW.full_name IS NOT NULL AND btrim(NEW.full_name) <> '' THEN
    NEW.name := btrim(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_staff_sync_names ON public.security_staff;

CREATE TRIGGER trg_security_staff_sync_names
  BEFORE INSERT OR UPDATE OF name, full_name ON public.security_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_security_staff_name_columns();
