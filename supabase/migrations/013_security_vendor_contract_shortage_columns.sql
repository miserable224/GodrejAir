-- EF maps SecurityVendorContract shortage penalty fields (snake_case).
-- Fixes: 42703 column s.shortage_threshold_percentage does not exist on daily-entry / contract load.

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS shortage_threshold_percentage numeric(18, 2) NOT NULL DEFAULT 5.0;

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS high_shortage_penalty_percentage numeric(18, 2) NOT NULL DEFAULT 30.0;

COMMENT ON COLUMN public.security_vendor_contracts.shortage_threshold_percentage IS
  'Shortage % above which extra penalty applies (maps to ShortageThresholdPercentage in API)';
COMMENT ON COLUMN public.security_vendor_contracts.high_shortage_penalty_percentage IS
  'Extra penalty % when shortage exceeds threshold (maps to HighShortagePenaltyPercentage in API)';
