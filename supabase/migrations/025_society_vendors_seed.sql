-- ─────────────────────────────────────────────────────────────────────────
-- Dummy seed for the `vendors` table: fruit + vegetable carts.
-- Coverage rule: every day Sun–Sat has at least one MORNING and one EVENING
-- vendor visible to the resident concierge.
--
-- Idempotent: each vendor is skipped if a row with the same name already
-- exists for the society.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_society_id uuid;
BEGIN
    ------------------------------------------------------------------
    -- Reuse the society id from existing data (classes seeded earlier);
    -- otherwise fall back to a deterministic placeholder so all rows
    -- belong to the same society.
    ------------------------------------------------------------------
    SELECT society_id INTO v_society_id FROM vendors LIMIT 1;
    IF v_society_id IS NULL THEN
        SELECT society_id INTO v_society_id FROM classes LIMIT 1;
    END IF;
    IF v_society_id IS NULL THEN
        v_society_id := '00000000-0000-0000-0000-000000000001'::uuid;
    END IF;

    ----------------------------------------------------------------------
    -- MORNING — fruits & vegetables (06:30–11:00)
    ----------------------------------------------------------------------

    -- Mon, Wed, Fri — Fruits
    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Ramesh Fresh Fruits') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Ramesh Fresh Fruits', 'Fruits',
            'Seasonal fruits from Devanahalli farms — apples, bananas, papaya, watermelon.',
            '9876501001', '9876501001',
            'Fruit Cart 1', 'Main gate, near visitor lobby',
            ARRAY['monday','wednesday','friday'], '07:00', '10:00',
            true, 4.6, true
        );
    END IF;

    -- Tue, Thu, Sat — Vegetables
    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Sunny Greens Vegetables') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Sunny Greens Vegetables', 'Vegetables',
            'Hosur leafy greens & daily vegetables — palak, methi, tomato, onion.',
            '9876501002', '9876501002',
            'Veg Cart A', 'Clubhouse driveway',
            ARRAY['tuesday','thursday','saturday'], '06:30', '09:30',
            true, 4.8, true
        );
    END IF;

    -- Sunday — mixed (only morning vendor that day)
    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Sunday Organic Bazaar') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Sunday Organic Bazaar', 'Fruits',
            'Weekly farmers'' market: organic fruits, vegetables, cold-pressed juices.',
            '9876501003', NULL,
            'Bazaar Tents', 'Tennis court parking',
            ARRAY['sunday'], '07:00', '11:00',
            false, 4.3, true
        );
    END IF;

    ----------------------------------------------------------------------
    -- EVENING — fruits & vegetables (17:00–20:00)
    ----------------------------------------------------------------------

    -- Mon, Wed, Fri — Vegetables
    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Pravin Daily Vegetables') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Pravin Daily Vegetables', 'Vegetables',
            'Evening sabzi cart — carrots, beans, capsicum, ginger-garlic packs.',
            '9876502001', '9876502001',
            'Veg Cart B', 'Tower D entrance',
            ARRAY['monday','wednesday','friday'], '17:00', '19:30',
            true, 4.5, true
        );
    END IF;

    -- Tue, Thu, Sat — Fruits
    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Krishna Fruit Cart') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Krishna Fruit Cart', 'Fruits',
            'Premium fruits — strawberries, dragonfruit, mangoes (in season).',
            '9876502002', '9876502002',
            'Fruit Cart 2', 'Amphitheatre stairs',
            ARRAY['tuesday','thursday','saturday'], '17:30', '20:00',
            true, 4.7, true
        );
    END IF;

    -- Sunday — mixed (only evening vendor that day)
    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Hari Bhog Evening Mart') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Hari Bhog Evening Mart', 'Vegetables',
            'Mixed vegetables + tropical fruits for the week-end restock.',
            '9876502003', NULL,
            'Pop-up Stall', 'East gate parking bay',
            ARRAY['sunday'], '17:00', '20:00',
            false, 4.2, true
        );
    END IF;

    ----------------------------------------------------------------------
    -- BONUS — high-frequency vendors visible every weekday (rotate stalls)
    ----------------------------------------------------------------------

    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Anna Banana Cart') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Anna Banana Cart', 'Fruits',
            'Just bananas — robusta, yelakki, red bananas. Sold by the dozen.',
            '9876503001', '9876503001',
            'Mobile Cart', 'Roams between A & B towers',
            ARRAY['monday','tuesday','wednesday','thursday','friday'],
            '08:00', '11:00',
            true, 4.4, true
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendors
                   WHERE society_id = v_society_id AND vendor_name = 'Green Basket Express') THEN
        INSERT INTO vendors (
            society_id, vendor_name, category, description,
            phone_number, whatsapp_number,
            stall_name, stall_location,
            available_days, available_from, available_to,
            verified, rating, active
        ) VALUES (
            v_society_id, 'Green Basket Express', 'Vegetables',
            'WhatsApp pre-orders by 4 PM, delivered to the gate by 6:30 PM.',
            '9876503002', '9876503002',
            'Pre-order Service', 'Main gate counter',
            ARRAY['monday','tuesday','wednesday','thursday','friday','saturday'],
            '18:00', '19:30',
            true, 4.9, true
        );
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Coverage check — run after the seed to confirm every day has ≥1 morning
-- and ≥1 evening vendor:
--
--   WITH days AS (
--     SELECT unnest(ARRAY['sunday','monday','tuesday','wednesday',
--                         'thursday','friday','saturday']) AS d
--   )
--   SELECT
--     d AS day,
--     COUNT(*) FILTER (WHERE available_from < TIME '12:00') AS morning_vendors,
--     COUNT(*) FILTER (WHERE available_from >= TIME '12:00') AS evening_vendors
--   FROM days
--   LEFT JOIN vendors v
--     ON v.active AND v.deleted_at IS NULL
--    AND d = ANY(v.available_days)
--   GROUP BY d
--   ORDER BY CASE d
--     WHEN 'sunday' THEN 0 WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2
--     WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5
--     ELSE 6
--   END;
-- ─────────────────────────────────────────────────────────────────────────
