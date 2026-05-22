-- Promotions management (replaces society_promotions from 017)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS society_promotions CASCADE;

-- 1. Board members
CREATE TABLE IF NOT EXISTS board_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    role text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name text NOT NULL,
    contact_person text,
    phone text,
    email text,
    address text,
    gst_number text,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors (vendor_name);

-- 3. Promotion types
CREATE TABLE IF NOT EXISTS promotion_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name text NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO promotion_types (type_name, description)
VALUES
    ('Lift Branding', 'Branding inside lifts'),
    ('Digital Screen', 'Digital display advertisements'),
    ('Banner', 'Society banner advertisements'),
    ('Festival Stall', 'Temporary event stalls'),
    ('Clubhouse Branding', 'Clubhouse area advertisements'),
    ('Parking Branding', 'Parking area branding'),
    ('Standee', 'Standee advertisements')
ON CONFLICT (type_name) DO NOTHING;

-- 4. Promotion inventory
CREATE TABLE IF NOT EXISTS promotion_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_name text NOT NULL,
    inventory_code text UNIQUE,
    promotion_type_id uuid REFERENCES promotion_types (id),
    location text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Promotions
CREATE TABLE IF NOT EXISTS promotions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_type_id uuid NOT NULL REFERENCES promotion_types (id),
    inventory_id uuid REFERENCES promotion_inventory (id),
    vendor_id uuid NOT NULL REFERENCES vendors (id),
    board_member_id uuid REFERENCES board_members (id),
    promotion_title text,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal_amount numeric(12, 2) NOT NULL,
    gst_percentage numeric(5, 2) NOT NULL DEFAULT 18,
    gst_amount numeric(12, 2) NOT NULL,
    total_amount numeric(12, 2) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    payment_status text NOT NULL DEFAULT 'Pending'
        CHECK (payment_status IN ('Pending', 'Partial', 'Paid')),
    promotion_status text NOT NULL DEFAULT 'Upcoming'
        CHECK (promotion_status IN ('Upcoming', 'Active', 'Expired', 'Cancelled')),
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_promotions_vendor ON promotions (vendor_id);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions (promotion_status);

-- 6. Promotion payments
CREATE TABLE IF NOT EXISTS promotion_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id uuid NOT NULL REFERENCES promotions (id) ON DELETE CASCADE,
    payment_date date NOT NULL,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    payment_mode text,
    payment_reference_number text,
    receipt_url text,
    notes text,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotion_payments_promotion ON promotion_payments (promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_payments_date ON promotion_payments (payment_date);

-- 7. Promotion documents
CREATE TABLE IF NOT EXISTS promotion_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id uuid NOT NULL REFERENCES promotions (id) ON DELETE CASCADE,
    file_name text,
    file_url text NOT NULL,
    document_type text,
    uploaded_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Activity logs
CREATE TABLE IF NOT EXISTS promotion_activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promotion_id uuid REFERENCES promotions (id) ON DELETE CASCADE,
    action text NOT NULL,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Default vendor for quick mobile entry
INSERT INTO vendors (vendor_name, contact_person, is_active)
SELECT 'General Vendor', 'Society Office', true
WHERE NOT EXISTS (SELECT 1 FROM vendors);

-- Sample board member
INSERT INTO board_members (name, role, phone)
SELECT 'Karthik Reddy', 'Treasurer', '9876543210'
WHERE NOT EXISTS (
    SELECT 1 FROM board_members WHERE name = 'Karthik Reddy' AND phone = '9876543210'
);

-- Updated-at helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_board_members_updated_at ON board_members;
CREATE TRIGGER trg_board_members_updated_at
    BEFORE UPDATE ON board_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_promotion_types_updated_at ON promotion_types;
CREATE TRIGGER trg_promotion_types_updated_at
    BEFORE UPDATE ON promotion_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_promotion_inventory_updated_at ON promotion_inventory;
CREATE TRIGGER trg_promotion_inventory_updated_at
    BEFORE UPDATE ON promotion_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON promotions;
CREATE TRIGGER trg_promotions_updated_at
    BEFORE UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_promotion_status()
RETURNS trigger AS $$
BEGIN
    IF NEW.promotion_status = 'Cancelled' THEN
        RETURN NEW;
    END IF;

    IF current_date BETWEEN NEW.start_date AND NEW.end_date THEN
        NEW.promotion_status := 'Active';
    ELSIF current_date < NEW.start_date THEN
        NEW.promotion_status := 'Upcoming';
    ELSIF current_date > NEW.end_date THEN
        NEW.promotion_status := 'Expired';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_promotion_status ON promotions;
CREATE TRIGGER trg_update_promotion_status
    BEFORE INSERT OR UPDATE ON promotions
    FOR EACH ROW EXECUTE FUNCTION update_promotion_status();

CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS trigger AS $$
DECLARE
    total_paid numeric(12, 2);
    promotion_total numeric(12, 2);
    promo_id uuid;
BEGIN
    promo_id := COALESCE(NEW.promotion_id, OLD.promotion_id);

    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM promotion_payments
    WHERE promotion_id = promo_id;

    SELECT total_amount INTO promotion_total
    FROM promotions
    WHERE id = promo_id;

    IF total_paid = 0 THEN
        UPDATE promotions SET payment_status = 'Pending' WHERE id = promo_id;
    ELSIF total_paid < promotion_total THEN
        UPDATE promotions SET payment_status = 'Partial' WHERE id = promo_id;
    ELSE
        UPDATE promotions SET payment_status = 'Paid' WHERE id = promo_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_payment_status ON promotion_payments;
CREATE TRIGGER trg_update_payment_status
    AFTER INSERT OR UPDATE OR DELETE ON promotion_payments
    FOR EACH ROW EXECUTE FUNCTION update_payment_status();

CREATE OR REPLACE VIEW vw_promotion_dashboard AS
SELECT
    p.id,
    p.promotion_title,
    pt.type_name AS promotion_type,
    v.vendor_name,
    v.contact_person,
    v.phone AS vendor_phone,
    bm.name AS board_member,
    p.quantity,
    p.unit_price,
    p.subtotal_amount,
    p.gst_percentage,
    p.gst_amount,
    p.total_amount,
    p.payment_status,
    p.promotion_status,
    p.start_date,
    p.end_date,
    (
        SELECT COALESCE(SUM(pp.amount), 0)
        FROM promotion_payments pp
        WHERE pp.promotion_id = p.id
    ) AS amount_collected,
    (
        p.total_amount - (
            SELECT COALESCE(SUM(pp.amount), 0)
            FROM promotion_payments pp
            WHERE pp.promotion_id = p.id
        )
    ) AS pending_amount,
    p.created_at
FROM promotions p
LEFT JOIN vendors v ON p.vendor_id = v.id
LEFT JOIN promotion_types pt ON p.promotion_type_id = pt.id
LEFT JOIN board_members bm ON p.board_member_id = bm.id;

CREATE OR REPLACE VIEW vw_collection_summary AS
SELECT
    payment_date,
    COUNT(*) AS total_transactions,
    SUM(amount) AS total_collection
FROM promotion_payments
GROUP BY payment_date
ORDER BY payment_date DESC;

CREATE OR REPLACE VIEW vw_active_promotions AS
SELECT *
FROM vw_promotion_dashboard
WHERE promotion_status = 'Active';

CREATE OR REPLACE VIEW vw_vendor_revenue AS
SELECT
    v.id AS vendor_id,
    v.vendor_name,
    COUNT(p.id) AS total_promotions,
    COALESCE(SUM(p.total_amount), 0) AS total_business,
    COALESCE(SUM((
        SELECT COALESCE(SUM(pp.amount), 0)
        FROM promotion_payments pp
        WHERE pp.promotion_id = p.id
    )), 0) AS total_collected
FROM vendors v
LEFT JOIN promotions p ON v.id = p.vendor_id
GROUP BY v.id, v.vendor_name;
