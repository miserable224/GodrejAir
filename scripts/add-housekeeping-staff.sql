-- Step 1: allow HK roles (run once — fixes security_staff_role_check error)
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

-- Step 2: add staff (names only). Safe to re-run — skips existing name + role.
INSERT INTO public.security_staff (name, full_name, role, is_active)
SELECT v.name, v.name, v.role, v.active
FROM (VALUES
    ('Krishnamurthy',       'HK_SUPERVISOR', true),
    ('Bharatamma',          'HK_STAFF',      true),
    ('Deepha',              'HK_STAFF',      true),
    ('Devi',                'HK_STAFF',      true),
    ('Sushilamma',          'HK_STAFF',      true),
    ('Chandana',            'HK_STAFF',      true),
    ('Rani',                'HK_STAFF',      true),
    ('Sumitra',             'HK_STAFF',      true),
    ('Pallvi',              'HK_STAFF',      true),
    ('Pullamma',            'HK_STAFF',      true),
    ('Shivamma Saraswati',  'HK_STAFF',      true),
    ('Manjula',             'HK_STAFF',      false),
    ('Aswini',              'HK_STAFF',      true),
    ('Mahalaxmi',           'HK_STAFF',      true),
    ('Swathi',              'HK_STAFF',      true),
    ('Amaravathi',          'HK_STAFF',      true),
    ('Manic',               'HK_STAFF',      true),
    ('Chand',               'HK_STAFF',      true),
    ('Teja',                'HK_STAFF',      true),
    ('Mahadevappa',         'HK_STAFF',      true),
    ('Ramaya',              'HK_STAFF',      true),
    ('Muniraju',            'HK_STAFF',      true),
    ('Subaramani',          'HK_STAFF',      true),
    ('Manjula P',           'HK_STAFF',      true),
    ('Viresh',              'HK_STAFF',      false)
) AS v(name, role, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = v.role
);
