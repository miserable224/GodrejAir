-- Annexure-III MANPOWER DEPLOYMENT — contract rates (₹/month per person, shift strength, headcount).
-- Run after 015_housekeeping_contracts.sql.

ALTER TABLE public.hk_contract_rates
    ADD COLUMN IF NOT EXISTS headcount_sanctioned int NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shift_timings text,
    ADD COLUMN IF NOT EXISTS skill_type text NOT NULL DEFAULT 'Skilled';

UPDATE public.hk_vendor_contracts
SET
    contract_number = 'HK-ANNEXURE-III-2025',
    vendor_name = 'Sparkle Facility Services Pvt Ltd',
    updated_at = timezone('utc', now())
WHERE id = 'a1000000-0000-4000-8000-000000000001';

-- Full manpower table (10 roles). shift1 + shift2 = deployment slots; headcount_sanctioned = No. of staff.
INSERT INTO public.hk_contract_rates (
    contract_id,
    role_code,
    role_name,
    monthly_rate,
    headcount_sanctioned,
    shift_timings,
    skill_type,
    shift1_sanctioned,
    shift2_sanctioned,
    is_active
)
VALUES
    ('a1000000-0000-4000-8000-000000000001', 'HK_FM', 'Facility Manager', 55000.00, 1, '9:00 AM – 6:30 PM', 'Skilled', 1, 0, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_AFM', 'Assistant Facility Manager', 40000.00, 1, '10:30 AM – 8:00 PM', 'Skilled', 1, 0, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_CRM', 'CRM / Accountant', 30000.00, 1, '9:00 AM – 6:30 PM', 'Skilled', 1, 0, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_FRONT_OFFICE', 'Front Office Exe / Helpdesk', 28750.00, 1, '9:00 AM – 6:30 PM', 'Skilled', 1, 0, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_SUPERVISOR', 'Housekeeping Supervisor', 20000.00, 1, '8:30 AM – 5:30 PM', 'Skilled', 1, 0, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_STAFF', 'Housekeeping Staff', 16865.00, 24, '24 Hours (Shifts)', 'Skilled', 12, 12, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_GARDENER', 'Gardener', 16865.00, 3, '8:30 AM – 5:30 PM', 'Skilled', 3, 0, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_ELECTRICIAN', 'Electrician', 25300.00, 4, '24 Hours (Shifts)', 'Skilled', 2, 2, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_PLUMBER', 'Plumber', 25300.00, 4, '24 Hours (Shifts)', 'Skilled', 2, 2, true),
    ('a1000000-0000-4000-8000-000000000001', 'HK_STP_OPERATOR', 'STP/WTP/Pool Operator', 27025.00, 4, '24 Hours (Shifts)', 'Skilled', 2, 2, true)
ON CONFLICT (contract_id, role_code) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    monthly_rate = EXCLUDED.monthly_rate,
    headcount_sanctioned = EXCLUDED.headcount_sanctioned,
    shift_timings = EXCLUDED.shift_timings,
    skill_type = EXCLUDED.skill_type,
    shift1_sanctioned = EXCLUDED.shift1_sanctioned,
    shift2_sanctioned = EXCLUDED.shift2_sanctioned,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc', now());

-- Deactivate legacy partial seed rows if role codes were renamed (no-op if already updated).
UPDATE public.hk_contract_rates
SET is_active = false, updated_at = timezone('utc', now())
WHERE contract_id = 'a1000000-0000-4000-8000-000000000001'
  AND role_code NOT IN (
    'HK_FM', 'HK_AFM', 'HK_CRM', 'HK_FRONT_OFFICE', 'HK_SUPERVISOR', 'HK_STAFF',
    'HK_GARDENER', 'HK_ELECTRICIAN', 'HK_PLUMBER', 'HK_STP_OPERATOR'
  );
