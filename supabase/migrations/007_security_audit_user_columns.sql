-- Optional: add user audit FK columns if you prefer them in the database instead of relying on EF ignores.
-- The .NET API maps AuditableEntity.CreatedBy / UpdatedBy as ignored unless these columns exist.

ALTER TABLE public.security_vendor_contracts ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_vendor_contracts ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_role_rates ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_role_rates ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_sanctioned_strength ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_sanctioned_strength ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_staff ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_staff ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_locations ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_locations ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_shifts ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_shifts ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_shift_deployments ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_shift_deployments ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.patrol_logs ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.patrol_logs ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.patrol_log_staff ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.patrol_log_staff ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.patrol_photos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.patrol_photos ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_daily_attendance_summary ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_daily_attendance_summary ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_monthly_billing ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_monthly_billing ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.security_monthly_billing_items ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.security_monthly_billing_items ADD COLUMN IF NOT EXISTS updated_by uuid;
