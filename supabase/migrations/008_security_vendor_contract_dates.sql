-- EF maps SecurityVendorContract.StartDate/EndDate -> start_date / end_date (snake_case).
-- Fixes: 42703 column s.end_date does not exist when loading vendor contract / billing.

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS start_date timestamptz NOT NULL DEFAULT (timezone('utc', now()));

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS end_date timestamptz NOT NULL DEFAULT ((timezone('utc', now()) + interval '3 years'));

COMMENT ON COLUMN public.security_vendor_contracts.start_date IS 'Contract start (maps to StartDate in API)';
COMMENT ON COLUMN public.security_vendor_contracts.end_date IS 'Contract end (maps to EndDate in API)';
