-- Morning / night shift on duty check-in and check-out (inferred from photo time, IST).
ALTER TABLE public.security_duty_sessions
  ADD COLUMN IF NOT EXISTS entry_shift varchar(20),
  ADD COLUMN IF NOT EXISTS exit_shift varchar(20);

CREATE INDEX IF NOT EXISTS ix_security_duty_sessions_entry_shift
  ON public.security_duty_sessions (entry_shift);
