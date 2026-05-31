-- ════════════════════════════════════════════════════════════════════════════
-- 031_auth_operational_users.sql
-- Deactivates legacy demo/test app users so only operational logins work.
-- User rows + password hashes are created/updated by the API AuthUserSeeder
-- on startup (see Auth:SeedUsers in appsettings).
--
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.security_app_users
SET is_active = false,
    updated_at = now()
WHERE lower(username) NOT IN ('admin', 'ss', 'fmhk')
  AND is_active = true;
