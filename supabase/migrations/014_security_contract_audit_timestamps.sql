-- Align contract/billing tables with AuditableEntity (created_at / updated_at).
-- Fixes: 42703 column s.updated_at does not exist on daily-entry / contract load.
-- Migration 007 added created_by/updated_by only; these tables still need timestamps.

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.security_vendor_contracts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.security_role_rates
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.security_role_rates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.security_sanctioned_strength
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.security_sanctioned_strength
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.security_daily_attendance_summary
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT timezone('utc', now());

ALTER TABLE public.security_daily_attendance_summary
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
