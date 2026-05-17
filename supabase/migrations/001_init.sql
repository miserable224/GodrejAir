-- Supabase migration: initial schema for Workforce and Water modules

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users (if you've chosen to use Supabase Auth, keep this as profile table linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  phone text,
  role text NOT NULL DEFAULT 'resident', -- 'admin'|'resident'|'staff'|'supervisor'
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Modules (feature toggles)
CREATE TABLE IF NOT EXISTS modules (
  id serial PRIMARY KEY,
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Tasks (generic pending items)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open', -- open | in_progress | closed
  priority smallint DEFAULT 3,
  assigned_to uuid REFERENCES profiles(id),
  module_key text REFERENCES modules(key),
  due_date date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Workforce: posts (locations) and assignments
CREATE TABLE IF NOT EXISTS posts (
  id serial PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date date NOT NULL,
  shift text NOT NULL,
  staff_id uuid REFERENCES profiles(id),
  post_id int REFERENCES posts(id),
  role text NOT NULL DEFAULT 'Guard',
  note text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Water records and vendors
CREATE TABLE IF NOT EXISTS water_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text,
  address text,
  vehicle_no text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS water_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  source text,
  source_type text,
  vehicle_no text,
  opening_meter text,
  closing_meter text,
  tds text,
  load text,
  tank_level_kl numeric,
  vendor_id uuid REFERENCES water_vendors(id),
  notes text,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Push tokens and notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  title text,
  body text,
  data jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes commonly useful
CREATE INDEX IF NOT EXISTS idx_assignments_date_shift ON assignments(assignment_date, shift);
CREATE INDEX IF NOT EXISTS idx_water_records_date ON water_records(date);

-- Note: add RLS policies after creating tables (next steps)
