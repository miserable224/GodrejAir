-- Align security_vendor_contracts with EF Core (snake_case) expectations.
-- Fixes: 42703 column s.contract_number does not exist on monthly-calculation.

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS contract_number character varying(100) NOT NULL DEFAULT '';

COMMENT ON COLUMN public.security_vendor_contracts.contract_number IS 'Vendor agreement reference (maps to ContractNumber in API)';

-- If an older patch added contract_no only, copy into contract_number once.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'security_vendor_contracts' AND column_name = 'contract_no'
  ) THEN
    UPDATE public.security_vendor_contracts
    SET contract_number = COALESCE(NULLIF(TRIM(contract_number), ''), TRIM(contract_no))
    WHERE TRIM(COALESCE(contract_number, '')) = '' AND TRIM(COALESCE(contract_no, '')) <> '';
  END IF;
END $$;
