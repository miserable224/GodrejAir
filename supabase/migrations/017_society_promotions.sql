-- Superseded by 018_promotions_management.sql (drops society_promotions and creates full schema).
-- Society promotions (category, qty, price, GST 18%) — legacy stub
CREATE TABLE IF NOT EXISTS society_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(14, 2) NOT NULL,
  gst_rate numeric(6, 4) NOT NULL DEFAULT 0.18,
  gst_amount numeric(14, 2) NOT NULL,
  total_amount numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_society_promotions_created_at ON society_promotions (created_at DESC);
