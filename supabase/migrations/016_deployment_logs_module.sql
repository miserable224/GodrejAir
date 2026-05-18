-- Separate security vs housekeeping deployment rows (two APIs, one database).

ALTER TABLE public.security_deployment_logs
  ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'security';

CREATE INDEX IF NOT EXISTS ix_security_deployment_logs_module
  ON public.security_deployment_logs (module);

CREATE INDEX IF NOT EXISTS ix_security_deployment_logs_module_log_date
  ON public.security_deployment_logs (module, log_date);

-- Existing rows without module stay as security via DEFAULT.
