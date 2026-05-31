-- Security staff — Day shift 31/05/2026 (names only, no post).
-- Safe to re-run — skips existing name + role.

-- Allow security + HK roles (skip if migration 035 already applied).
ALTER TABLE public.security_staff DROP CONSTRAINT IF EXISTS security_staff_role_check;

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

INSERT INTO public.security_staff (name, full_name, role, is_active)
SELECT v.name, v.name, v.role, true
FROM (VALUES
    ('Ningya',            'SECURITY_GUARD'),
    ('Santoya Jea',       'SECURITY_GUARD'),
    ('Sharani S',         'SECURITY_GUARD'),
    ('M Agarwal',         'SECURITY_GUARD'),
    ('Nadumuddin Ahmed',  'SECURITY_GUARD'),
    ('Raju Kumar',        'SECURITY_GUARD'),
    ('Mahesh Kumar',      'SECURITY_GUARD'),
    ('Prasanta Bagdi',    'SECURITY_GUARD'),
    ('Tumpa Dutta',       'SECURITY_GUARD')
) AS v(name, role)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = v.role
);
