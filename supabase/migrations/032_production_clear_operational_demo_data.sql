-- ════════════════════════════════════════════════════════════════════════════
-- 032_production_clear_operational_demo_data.sql
-- Production reset: remove demo staff names, water vendors/records, and
-- operational history that embeds person names. Safe to re-run (DELETEs only).
--
-- CLEARED
--   • security_staff roster (individual guard names)
--   • security_deployment_logs + photos (staff_name rows)
--   • security_duty_sessions, housekeeping_duty_sessions
--   • patrol_logs, patrol_log_staff, patrol_photos, shift deployments
--   • water_records, water_record_photos, water_vendors, water_vendor_vehicles
--
-- PRESERVED (unchanged)
--   • security_vendor_contracts, security_role_rates, security_sanctioned_strength
--   • hk_vendor_contracts, hk_contract_rates (role_name, monthly_rate, headcount)
--   • security_locations, security_app_users
--
-- Run after 027–031 on production Supabase. Re-add staff/vendors via the app.
-- Clear API disk uploads (wwwroot/uploads) separately if old photo URLs remain.
-- ════════════════════════════════════════════════════════════════════════════

-- Water
DELETE FROM public.water_record_photos;
DELETE FROM public.water_records;
DELETE FROM public.water_vendor_vehicles;
DELETE FROM public.water_vendors;

-- Deployment & duty sessions (staff_name cleared by removing rows)
DELETE FROM public.security_deployment_photos;
DELETE FROM public.security_deployment_logs;
DELETE FROM public.security_duty_sessions;
DELETE FROM public.housekeeping_duty_sessions;

-- Patrol / shifts (must run before security_staff — FK RESTRICT)
DELETE FROM public.patrol_photos;
DELETE FROM public.patrol_log_staff;
DELETE FROM public.patrol_logs;
DELETE FROM public.security_shift_deployments;
DELETE FROM public.security_shifts;

-- Security staff roster
DELETE FROM public.security_staff;

-- ════════════════════════════════════════════════════════════════════════════
-- Verify:
--   SELECT count(*) FROM security_staff;        -- 0
--   SELECT count(*) FROM water_vendors;         -- 0
--   SELECT count(*) FROM water_records;         -- 0
--   SELECT count(*) FROM hk_contract_rates;     -- still 10 (or your active rows)
-- ════════════════════════════════════════════════════════════════════════════
