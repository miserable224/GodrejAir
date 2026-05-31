-- Housekeeping roster — Godrej Air deployment 31/05/2026 (PFB Morning, 1st deployment).
-- Inserts into shared security_staff table (HK roles). Safe to re-run.
--
-- Run after: 033, 034, 035, 036, 037, 038
-- Verify: SELECT name, badge_number, role, is_active FROM security_staff
--         WHERE role IN ('HK_SUPERVISOR','HK_STAFF','HOUSEKEEPING','CLEANER')
--         ORDER BY is_active DESC, name;

-- ── Facility management ─────────────────────────────────────────────────────
INSERT INTO public.security_staff (name, full_name, badge_number, role, is_active)
SELECT v.name, v.name, v.badge, v.role, v.active
FROM (VALUES
    ('Krishnamurthy', 'Facility Manager · FMC', 'HK_SUPERVISOR', true)
) AS v(name, badge, role, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = v.role
);

-- ── Tower housekeeping (HK staff) ───────────────────────────────────────────
INSERT INTO public.security_staff (name, full_name, badge_number, role, is_active)
SELECT v.name, v.name, v.badge, 'HK_STAFF', v.active
FROM (VALUES
    ('Bharatamma',      'A Tower', true),
    ('Deepha',          'B Tower', true),
    ('Devi',            'C Tower', true),
    ('Sushilamma',      'D Tower', true),
    ('Chandana',        'E Tower', true),
    ('Rani',            'F Tower', true),
    ('Sumitra',         'G Tower · Common area', true),
    ('Pallvi',          'H Tower', true),
    ('Pullamma',        'J Tower', true),
    ('Shivamma Saraswati', 'Deployment 31/05/2026', true)
) AS v(name, badge, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = 'HK_STAFF'
);

-- ── Common area & club house ────────────────────────────────────────────────
INSERT INTO public.security_staff (name, full_name, badge_number, role, is_active)
SELECT v.name, v.name, v.badge, 'HK_STAFF', v.active
FROM (VALUES
    ('Manjula',    'Common area', false),  -- on leave 31/05/2026
    ('Aswini',     'Common area', true),
    ('Mahalaxmi',  'Common area', true),
    ('Swathi',     'Club house', true),
    ('Amaravathi', 'Club house', true)
) AS v(name, badge, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = 'HK_STAFF'
);

-- ── Extra work ──────────────────────────────────────────────────────────────
INSERT INTO public.security_staff (name, full_name, badge_number, role, is_active)
SELECT v.name, v.name, v.badge, 'HK_STAFF', true
FROM (VALUES
    ('Manic', 'Extra work', true),
    ('Chand', 'Extra work', true),
    ('Teja',  'Extra work', true)
) AS v(name, badge)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = 'HK_STAFF'
);

-- ── Horticulture / gardeners (3 deployed + notes for week off) ───────────────
INSERT INTO public.security_staff (name, full_name, badge_number, role, is_active)
SELECT v.name, v.name, v.badge, 'HK_STAFF', v.active
FROM (VALUES
    ('Mahadevappa', 'Horticulture', true),
    ('Ramaya',      'Horticulture', true),
    ('Muniraju',    'Horticulture', true),
    ('Subaramani',  'Horticulture · Garden (week off)', true),
    ('Manjula P',   'Horticulture', true)
) AS v(name, badge, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = 'HK_STAFF'
);

-- ── Other HK (leave) ────────────────────────────────────────────────────────
INSERT INTO public.security_staff (name, full_name, badge_number, role, is_active)
SELECT v.name, v.name, v.badge, 'HK_STAFF', false
FROM (VALUES
    ('Viresh', 'On leave 31/05/2026')
) AS v(name, badge)
WHERE NOT EXISTS (
    SELECT 1 FROM public.security_staff s
    WHERE lower(trim(s.name)) = lower(trim(v.name))
      AND s.role = 'HK_STAFF'
);

-- Refresh deployment zone on re-run (keeps ids stable for duty sessions).
UPDATE public.security_staff s SET
    badge_number = v.badge,
    full_name = v.name,
    is_active = v.active,
    updated_at = timezone('utc', now())
FROM (VALUES
    ('Krishnamurthy', 'Facility Manager · FMC', 'HK_SUPERVISOR', true),
    ('Bharatamma', 'A Tower', 'HK_STAFF', true),
    ('Deepha', 'B Tower', 'HK_STAFF', true),
    ('Devi', 'C Tower', 'HK_STAFF', true),
    ('Sushilamma', 'D Tower', 'HK_STAFF', true),
    ('Chandana', 'E Tower', 'HK_STAFF', true),
    ('Rani', 'F Tower', 'HK_STAFF', true),
    ('Sumitra', 'G Tower · Common area', 'HK_STAFF', true),
    ('Pallvi', 'H Tower', 'HK_STAFF', true),
    ('Pullamma', 'J Tower', 'HK_STAFF', true),
    ('Shivamma Saraswati', 'Deployment 31/05/2026', 'HK_STAFF', true),
    ('Manjula', 'Common area · Leave 31/05', 'HK_STAFF', false),
    ('Aswini', 'Common area', 'HK_STAFF', true),
    ('Mahalaxmi', 'Common area', 'HK_STAFF', true),
    ('Swathi', 'Club house', 'HK_STAFF', true),
    ('Amaravathi', 'Club house', 'HK_STAFF', true),
    ('Manic', 'Extra work', 'HK_STAFF', true),
    ('Chand', 'Extra work', 'HK_STAFF', true),
    ('Teja', 'Extra work', 'HK_STAFF', true),
    ('Mahadevappa', 'Horticulture', 'HK_STAFF', true),
    ('Ramaya', 'Horticulture', 'HK_STAFF', true),
    ('Muniraju', 'Horticulture', 'HK_STAFF', true),
    ('Subaramani', 'Horticulture · Garden (week off)', 'HK_STAFF', true),
    ('Manjula P', 'Horticulture', 'HK_STAFF', true),
    ('Viresh', 'On leave 31/05/2026', 'HK_STAFF', false)
) AS v(name, badge, role, active)
WHERE lower(trim(s.name)) = lower(trim(v.name))
  AND s.role = v.role;
