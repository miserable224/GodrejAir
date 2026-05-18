-- Housekeeping vendor contract + role rates (mirrors security contract model).

CREATE TABLE IF NOT EXISTS public.hk_vendor_contracts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name text NOT NULL,
    contract_number text NOT NULL,
    start_date timestamptz NOT NULL DEFAULT timezone('utc', now()),
    end_date timestamptz NOT NULL DEFAULT (timezone('utc', now()) + interval '1 year'),
    service_charge_percentage numeric(6, 2) NOT NULL DEFAULT 8.00,
    gst_percentage numeric(6, 2) NOT NULL DEFAULT 18.00,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.hk_contract_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id uuid NOT NULL REFERENCES public.hk_vendor_contracts(id) ON DELETE CASCADE,
    role_code text NOT NULL,
    role_name text NOT NULL,
    monthly_rate numeric(12, 2) NOT NULL,
    shift1_sanctioned int NOT NULL DEFAULT 0,
    shift2_sanctioned int NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE (contract_id, role_code)
);

CREATE INDEX IF NOT EXISTS ix_hk_contract_rates_contract_id ON public.hk_contract_rates (contract_id);

-- Demo contract: Sparkle Facility Services (Godrej Air)
INSERT INTO public.hk_vendor_contracts (
    id,
    vendor_name,
    contract_number,
    start_date,
    end_date,
    service_charge_percentage,
    gst_percentage,
    is_active
)
VALUES (
    'a1000000-0000-4000-8000-000000000001',
    'Sparkle Facility Services Pvt Ltd',
    'HK-GAIR-2025-042',
    '2025-04-01 00:00:00+00',
    '2026-03-31 23:59:59+00',
    8.00,
    18.00,
    true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hk_contract_rates (contract_id, role_code, role_name, monthly_rate, shift1_sanctioned, shift2_sanctioned)
VALUES
    ('a1000000-0000-4000-8000-000000000001', 'HK_SUPERVISOR', 'Housekeeping Supervisor', 22400.00, 1, 1),
    ('a1000000-0000-4000-8000-000000000001', 'HK_STAFF', 'Housekeeping Staff', 14850.00, 12, 12),
    ('a1000000-0000-4000-8000-000000000001', 'HK_GARDENER', 'Gardener', 18200.00, 2, 1),
    ('a1000000-0000-4000-8000-000000000001', 'HK_ELECTRICIAN', 'Electrician', 20500.00, 2, 2),
    ('a1000000-0000-4000-8000-000000000001', 'HK_PLUMBER', 'Plumber', 19800.00, 2, 2),
    ('a1000000-0000-4000-8000-000000000001', 'HK_STP_OPERATOR', 'STP/WTP/Pool Operator', 21200.00, 2, 2)
ON CONFLICT (contract_id, role_code) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    monthly_rate = EXCLUDED.monthly_rate,
    shift1_sanctioned = EXCLUDED.shift1_sanctioned,
    shift2_sanctioned = EXCLUDED.shift2_sanctioned;
