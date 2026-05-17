-- =============================================================================
-- Water management: dummy INSERTs
-- =============================================================================
-- (A) Use this file as-is if your database matches supabase/migrations/001_init.sql
--     (tables: water_vendors, water_records).
--
-- (B) If your hosted Supabase uses different table names (e.g. water_tanker_entry,
--     vendor_master, tank_master), run this first in the SQL editor to list columns:
--
--   SELECT table_name, column_name, data_type
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name IN (
--       'water_records','water_vendors',
--       'water_tanker_entry','vendor_master','tank_master'
--     )
--   ORDER BY table_name, ordinal_position;
--
-- Then map the INSERT lists below to your real column names / FKs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- (A) Schema: water_vendors + water_records (repo migrations)
-- ---------------------------------------------------------------------------

INSERT INTO water_vendors (id, name, contact_number, address, vehicle_no)
SELECT gen_random_uuid(), 'SwS water tanker', '9876543210', 'KR Puram, Bengaluru', 'KA53JR1035'
WHERE NOT EXISTS (SELECT 1 FROM water_vendors WHERE vehicle_no = 'KA53JR1035');

INSERT INTO water_vendors (id, name, contact_number, address, vehicle_no)
SELECT gen_random_uuid(), 'BlueLine Tankers', '9123456789', 'Whitefield, Bengaluru', 'KA01AB1234'
WHERE NOT EXISTS (SELECT 1 FROM water_vendors WHERE vehicle_no = 'KA01AB1234');

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
  '074808',
  '074822',
  '284',
  '02',
  62,
  (SELECT id FROM water_vendors WHERE vehicle_no = 'KA53JR1035' LIMIT 1),
  'Scripted dummy record',
  NULL,
  NULL
WHERE EXISTS (SELECT 1 FROM water_vendors WHERE vehicle_no = 'KA53JR1035')
  AND NOT EXISTS (
    SELECT 1 FROM water_records WHERE notes = 'Scripted dummy record' AND date = CURRENT_DATE
  );

-- ---------------------------------------------------------------------------
-- (B) TEMPLATE — remote-style names (EDIT columns after introspection)
-- ---------------------------------------------------------------------------
-- Example pattern only; uncomment and fix when you know your columns.
--
-- INSERT INTO vendor_master (id, name, phone, vehicle_registration, ...)
-- VALUES (gen_random_uuid(), 'SwS water tanker', '9876543210', 'KA53JR1035', ...);
--
-- INSERT INTO water_tanker_entry (
--   id, entry_date, vendor_id, tank_id, vehicle_no,
--   meter_open, meter_close, tds_ppm, loads, remarks, ...
-- )
-- VALUES (...);
