-- Allow housekeeping roster roles on security_staff (shared roster table).
-- Security ops roles remain unchanged.

ALTER TABLE public.security_staff
  DROP CONSTRAINT IF EXISTS security_staff_role_check;

ALTER TABLE public.security_staff
  ADD CONSTRAINT security_staff_role_check
  CHECK (
    role IN (
      'SECURITY_GUARD',
      'SUPERVISOR',
      'SECURITY_OFFICER',
      'ADMIN',
      'HOUSEKEEPING',
      'HK_SUPERVISOR',
      'HK_STAFF',
      'CLEANER'
    )
  );
