-- Dummy water data for local / migration schema (water_vendors + water_records)
-- Matches supabase/migrations/001_init.sql
-- Idempotent: safe to run more than once.

-- Vendors -------------------------------------------------------------------
INSERT INTO water_vendors (id, name, contact_number, address, vehicle_no)
SELECT gen_random_uuid(), 'SwS water tanker', '9876543210', 'KR Puram, Bengaluru', 'KA53JR1035'
WHERE NOT EXISTS (SELECT 1 FROM water_vendors WHERE vehicle_no = 'KA53JR1035');

INSERT INTO water_vendors (id, name, contact_number, address, vehicle_no)
SELECT gen_random_uuid(), 'BlueLine Tankers', '9123456789', 'Whitefield, Bengaluru', 'KA01AB1234'
WHERE NOT EXISTS (SELECT 1 FROM water_vendors WHERE vehicle_no = 'KA01AB1234');

INSERT INTO water_vendors (id, name, contact_number, address, vehicle_no)
SELECT gen_random_uuid(), 'City Water Supply', '9988776655', 'Indiranagar, Bengaluru', 'KA03CD9012'
WHERE NOT EXISTS (SELECT 1 FROM water_vendors WHERE vehicle_no = 'KA03CD9012');

-- Records (tanker loads) ------------------------------------------------------
INSERT INTO water_records (
  id, date, source, source_type, vehicle_no, opening_meter, closing_meter,
  tds, load, tank_level_kl, vendor_id, notes, receipt_url, created_by
)
SELECT
  gen_random_uuid(),
  (CURRENT_DATE - 1)::date,
  'SwS water tanker',
  'tanker',
  'KA53JR1035',
  '074900',
  '074915',
  '275',
  '02',
  60.5,
  v.id,
  'Dummy: evening load',
  NULL,
  NULL
FROM water_vendors v
WHERE v.vehicle_no = 'KA53JR1035'
  AND NOT EXISTS (
    SELECT 1 FROM water_records r
    WHERE r.vendor_id = v.id AND r.date = (CURRENT_DATE - 1)::date AND r.notes = 'Dummy: evening load'
  );

INSERT INTO water_records (
  id, date, source, source_type, vehicle_no, opening_meter, closing_meter,
  tds, load, tank_level_kl, vendor_id, notes, receipt_url, created_by
)
SELECT
  gen_random_uuid(),
  CURRENT_DATE,
  'SwS water tanker',
  'tanker',
  'KA53JR1035',
  '074915',
  '074930',
  '282',
  '02',
  62.0,
  v.id,
  'Dummy: today morning load',
  NULL,
  NULL
FROM water_vendors v
WHERE v.vehicle_no = 'KA53JR1035'
  AND NOT EXISTS (
    SELECT 1 FROM water_records r
    WHERE r.vendor_id = v.id AND r.date = CURRENT_DATE AND r.notes = 'Dummy: today morning load'
  );

INSERT INTO water_records (
  id, date, source, source_type, vehicle_no, opening_meter, closing_meter,
  tds, load, tank_level_kl, vendor_id, notes, receipt_url, created_by
)
SELECT
  gen_random_uuid(),
  (CURRENT_DATE - 3)::date,
  'BlueLine Tankers',
  'tanker',
  'KA01AB1234',
  '001200',
  '001218',
  '310',
  '03',
  58.0,
  v.id,
  'Dummy: triple load day',
  NULL,
  NULL
FROM water_vendors v
WHERE v.vehicle_no = 'KA01AB1234'
  AND NOT EXISTS (
    SELECT 1 FROM water_records r
    WHERE r.vendor_id = v.id AND r.date = (CURRENT_DATE - 3)::date AND r.notes = 'Dummy: triple load day'
  );

INSERT INTO water_records (
  id, date, source, source_type, vehicle_no, opening_meter, closing_meter,
  tds, load, tank_level_kl, vendor_id, notes, receipt_url, created_by
)
SELECT
  gen_random_uuid(),
  (CURRENT_DATE - 5)::date,
  'Kaveri water',
  'kaveri',
  '',
  '0',
  '0',
  '-',
  '0',
  55.0,
  NULL,
  'Dummy: municipal / bulk fill (no vendor row)',
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM water_records r
  WHERE r.date = (CURRENT_DATE - 5)::date AND r.notes = 'Dummy: municipal / bulk fill (no vendor row)'
);

INSERT INTO water_records (
  id, date, source, source_type, vehicle_no, opening_meter, closing_meter,
  tds, load, tank_level_kl, vendor_id, notes, receipt_url, created_by
)
SELECT
  gen_random_uuid(),
  (CURRENT_DATE - 7)::date,
  'City Water Supply',
  'tanker',
  'KA03CD9012',
  '050000',
  '050012',
  '268',
  '01',
  59.2,
  v.id,
  'Dummy: single load',
  NULL,
  NULL
FROM water_vendors v
WHERE v.vehicle_no = 'KA03CD9012'
  AND NOT EXISTS (
    SELECT 1 FROM water_records r
    WHERE r.vendor_id = v.id AND r.date = (CURRENT_DATE - 7)::date AND r.notes = 'Dummy: single load'
  );
