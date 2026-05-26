-- ─────────────────────────────────────────────────────────────────────────
-- Dummy seed for the resident concierge: classes + schedules
-- Idempotent: safe to run more than once (skips classes whose name already
-- exists for the same society).
--
-- Day-of-week convention: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_society_id uuid;
    v_class_id   uuid;
BEGIN
    ------------------------------------------------------------------
    -- Pick the society id from any existing class (e.g. the Karate row
    -- you already inserted). If none exists, generate a deterministic
    -- placeholder so all seed rows share the same society.
    ------------------------------------------------------------------
    SELECT society_id INTO v_society_id FROM classes LIMIT 1;
    IF v_society_id IS NULL THEN
        v_society_id := '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    ------------------------------------------------------------------
    -- 1) YOGA — Tue & Thu, 6:00–7:00 AM
    ------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM classes
                   WHERE society_id = v_society_id AND class_name = 'Yoga') THEN
        INSERT INTO classes (
            society_id, class_name, category, description,
            instructor_name, instructor_phone, instructor_email,
            venue, capacity, age_group, fee_monthly, active
        ) VALUES (
            v_society_id, 'Yoga', 'Wellness',
            'Sunrise hatha + pranayama. Bring your own mat.',
            'Priya Iyer', '9876543211', 'priya.yoga@example.com',
            'Clubhouse Hall A', 25, 'All ages', 1200, true
        ) RETURNING id INTO v_class_id;

        INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, recurring, status) VALUES
            (v_class_id, 2, '06:00', '07:00', true, 'active'),
            (v_class_id, 4, '06:00', '07:00', true, 'active');
    END IF;

    ------------------------------------------------------------------
    -- 2) KARATE — Mon & Wed, 6:00–7:00 PM
    ------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM classes
                   WHERE society_id = v_society_id AND class_name = 'Karate') THEN
        INSERT INTO classes (
            society_id, class_name, category, description,
            instructor_name, instructor_phone, instructor_email,
            venue, capacity, age_group, fee_monthly, active
        ) VALUES (
            v_society_id, 'Karate', 'Martial Arts',
            'Shotokan karate for kids — grading sessions every quarter.',
            'Bhagat Singh', '8861780502', 'bhagat.karate@example.com',
            'E Block Yoga Room', 25, '4-16', 1500, true
        ) RETURNING id INTO v_class_id;

        INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, recurring, status) VALUES
            (v_class_id, 1, '18:00', '19:00', true, 'active'),
            (v_class_id, 3, '18:00', '19:00', true, 'active');
    END IF;

    ------------------------------------------------------------------
    -- 3) PIANO — Wed & Fri, 5:00–6:00 PM
    ------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM classes
                   WHERE society_id = v_society_id AND class_name = 'Piano') THEN
        INSERT INTO classes (
            society_id, class_name, category, description,
            instructor_name, instructor_phone, instructor_email,
            venue, capacity, age_group, fee_monthly, active
        ) VALUES (
            v_society_id, 'Piano', 'Music',
            'Western classical piano — Trinity College graded curriculum.',
            'Ravi Menon', '9876543212', 'ravi.piano@example.com',
            'Clubhouse Music Room', 6, '6+', 2500, true
        ) RETURNING id INTO v_class_id;

        INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, recurring, status) VALUES
            (v_class_id, 3, '17:00', '18:00', true, 'active'),
            (v_class_id, 5, '17:00', '18:00', true, 'active');
    END IF;

    ------------------------------------------------------------------
    -- 4) BHARATANATYAM — Tue & Sat, 4:00–5:00 PM
    ------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM classes
                   WHERE society_id = v_society_id AND class_name = 'Bharatanatyam') THEN
        INSERT INTO classes (
            society_id, class_name, category, description,
            instructor_name, instructor_phone, instructor_email,
            venue, capacity, age_group, fee_monthly, active
        ) VALUES (
            v_society_id, 'Bharatanatyam', 'Dance',
            'Classical Bharatanatyam — Kalakshetra style. Annual arangetram.',
            'Lakshmi Rao', '9876543213', 'lakshmi.bn@example.com',
            'D Block Dance Studio', 15, '5-15', 2000, true
        ) RETURNING id INTO v_class_id;

        INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, recurring, status) VALUES
            (v_class_id, 2, '16:00', '17:00', true, 'active'),
            (v_class_id, 6, '16:00', '17:00', true, 'active');
    END IF;

    ------------------------------------------------------------------
    -- 5) KATHAK — Mon & Thu, 5:00–6:00 PM
    ------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM classes
                   WHERE society_id = v_society_id AND class_name = 'Kathak') THEN
        INSERT INTO classes (
            society_id, class_name, category, description,
            instructor_name, instructor_phone, instructor_email,
            venue, capacity, age_group, fee_monthly, active
        ) VALUES (
            v_society_id, 'Kathak', 'Dance',
            'Classical Kathak — Lucknow gharana. Tihais and gat-nikas.',
            'Anjali Kapoor', '9876543214', 'anjali.kathak@example.com',
            'D Block Dance Studio', 15, '6+', 1800, true
        ) RETURNING id INTO v_class_id;

        INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, recurring, status) VALUES
            (v_class_id, 1, '17:00', '18:00', true, 'active'),
            (v_class_id, 4, '17:00', '18:00', true, 'active');
    END IF;

    ------------------------------------------------------------------
    -- 6) FREESTYLE DANCE — Wed & Sat, 7:00–8:00 PM
    ------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM classes
                   WHERE society_id = v_society_id AND class_name = 'Freestyle Dance') THEN
        INSERT INTO classes (
            society_id, class_name, category, description,
            instructor_name, instructor_phone, instructor_email,
            venue, capacity, age_group, fee_monthly, active
        ) VALUES (
            v_society_id, 'Freestyle Dance', 'Dance',
            'Hip-hop & freestyle choreography. Society annual day performance.',
            'Karan Mehta', '9876543215', 'karan.dance@example.com',
            'E Block Yoga Room', 20, '10+', 1500, true
        ) RETURNING id INTO v_class_id;

        INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time, recurring, status) VALUES
            (v_class_id, 3, '19:00', '20:00', true, 'active'),
            (v_class_id, 6, '19:00', '20:00', true, 'active');
    END IF;
END $$;

-- Quick sanity check after running:
--   SELECT c.class_name, c.instructor_name, c.fee_monthly,
--          string_agg(
--              CASE s.day_of_week
--                  WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
--                  WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri'
--                  ELSE 'Sat'
--              END || ' ' || to_char(s.start_time, 'HH12:MIam'),
--              ', ' ORDER BY s.day_of_week
--          ) AS slots
--   FROM classes c
--   LEFT JOIN class_schedules s ON s.class_id = c.id
--   GROUP BY c.id
--   ORDER BY c.class_name;
