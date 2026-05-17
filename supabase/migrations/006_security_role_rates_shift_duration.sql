-- EF maps SecurityRoleRate.ShiftDuration -> shift_duration

ALTER TABLE public.security_role_rates
  ADD COLUMN IF NOT EXISTS shift_duration character varying(50) NOT NULL DEFAULT '12 Hours';
