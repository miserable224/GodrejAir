-- Seed migration for modules, posts, water_vendors, water_records, and sample assignments

-- 1) Seed modules (idempotent)
INSERT INTO modules (key, title, enabled) VALUES
  ('workforce', 'Workforce', true),
  ('water', 'Water', true)
ON CONFLICT (key) DO NOTHING;

-- 2) Seed posts (locations) if they do not exist
INSERT INTO posts (name)
SELECT 'Main Gate' WHERE NOT EXISTS (SELECT 1 FROM posts WHERE name = 'Main Gate');
INSERT INTO posts (name)
SELECT 'J Gym' WHERE NOT EXISTS (SELECT 1 FROM posts WHERE name = 'J Gym');
INSERT INTO posts (name)
SELECT 'Exit Gate' WHERE NOT EXISTS (SELECT 1 FROM posts WHERE name = 'Exit Gate');

-- 3) Seed a water vendor
INSERT INTO water_vendors (id, name, contact_number, address, vehicle_no)
SELECT gen_random_uuid(), 'SwS water tanker', '9876543210', 'KR Puram', 'KA53JR1035'
WHERE NOT EXISTS (SELECT 1 FROM water_vendors WHERE name = 'SwS water tanker');

-- 4) Seed a sample water record linked to the vendor
INSERT INTO water_records (id, date, source, source_type, vehicle_no, opening_meter, closing_meter, tds, load, tank_level_kl, notes, vendor_id)
SELECT
  gen_random_uuid(),
  now()::date,
  'SwS water tanker',
  'tanker',
  'KA53JR1035',
  '074808',
  '074822',
  '284',
  '02',
  62,
  'Sample record for UI testing',
  (SELECT id FROM water_vendors WHERE name = 'SwS water tanker' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM water_records r
  WHERE r.notes = 'Sample record for UI testing' AND r.vendor_id = (SELECT id FROM water_vendors WHERE name = 'SwS water tanker' LIMIT 1)
);

-- 5) Seed a historic water record
INSERT INTO water_records (id, date, source, source_type, vehicle_no, opening_meter, closing_meter, tds, load, tank_level_kl, notes, vendor_id)
SELECT
  gen_random_uuid(),
  (now() - interval '3 days')::date,
  'SwS water tanker',
  'tanker',
  'KA53JR1035',
  '074700',
  '074780',
  '290',
  '03',
  58,
  'Historic sample',
  (SELECT id FROM water_vendors WHERE name = 'SwS water tanker' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM water_records r
  WHERE r.notes = 'Historic sample' AND r.vendor_id = (SELECT id FROM water_vendors WHERE name = 'SwS water tanker' LIMIT 1)
);

-- 6) Seed sample assignments (use post ids)
INSERT INTO assignments (id, assignment_date, shift, staff_id, post_id, role, note)
SELECT gen_random_uuid(), now()::date, 'morning', NULL, p.id, 'Guard', 'Sample morning shift'
FROM posts p WHERE p.name = 'Main Gate'
AND NOT EXISTS (
  SELECT 1 FROM assignments a WHERE a.note = 'Sample morning shift' AND a.post_id = p.id AND a.assignment_date = now()::date
);

INSERT INTO assignments (id, assignment_date, shift, staff_id, post_id, role, note)
SELECT gen_random_uuid(), now()::date, 'night', NULL, p.id, 'Guard', 'Sample night shift'
FROM posts p WHERE p.name = 'J Gym'
AND NOT EXISTS (
  SELECT 1 FROM assignments a WHERE a.note = 'Sample night shift' AND a.post_id = p.id AND a.assignment_date = now()::date
);

-- End of seed migration
