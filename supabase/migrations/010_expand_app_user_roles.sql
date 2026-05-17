-- Expand security_app_users.role for society + operations roles

ALTER TABLE security_app_users DROP CONSTRAINT IF EXISTS security_app_users_role_check;

ALTER TABLE security_app_users ADD CONSTRAINT security_app_users_role_check
  CHECK (role IN (
    -- Society
    'RESIDENT', 'OWNER', 'BOARD_MEMBER', 'PRESIDENT', 'SECRETARY', 'VICE_PRESIDENT', 'TREASURER',
    -- Operations
    'SUPER_ADMIN', 'SECURITY_SUPERVISOR', 'SECURITY_GUARD', 'FM', 'AFM',
    -- Legacy (migrate over time)
    'ADMIN', 'SUPERVISOR'
  ));

-- Normalize legacy rows if present
UPDATE security_app_users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
UPDATE security_app_users SET role = 'SECURITY_SUPERVISOR' WHERE role = 'SUPERVISOR';
