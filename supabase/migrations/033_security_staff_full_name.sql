-- security_staff baseline (canonical display column: name). Safe to re-run.

CREATE TABLE IF NOT EXISTS public.security_staff (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            varchar(200) NOT NULL,
    badge_number    varchar(50),
    role            varchar(50) NOT NULL DEFAULT 'SECURITY_GUARD',
    phone           varchar(30),
    is_active       boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz,
    created_by      uuid,
    updated_by      uuid
);

CREATE INDEX IF NOT EXISTS ix_security_staff_role ON public.security_staff (role);
CREATE INDEX IF NOT EXISTS ix_security_staff_is_active ON public.security_staff (is_active);

-- Legacy full_name-only or dual-column schemas → align to name.
ALTER TABLE public.security_staff ADD COLUMN IF NOT EXISTS name varchar(200);
ALTER TABLE public.security_staff ADD COLUMN IF NOT EXISTS full_name varchar(200);

UPDATE public.security_staff
SET name = full_name
WHERE (name IS NULL OR trim(name) = '')
  AND full_name IS NOT NULL
  AND trim(full_name) <> '';
