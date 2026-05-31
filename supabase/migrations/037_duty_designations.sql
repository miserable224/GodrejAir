-- Configurable duty check-in designations (Security + Housekeeping).

CREATE TABLE IF NOT EXISTS public.duty_designations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module      varchar(32) NOT NULL,
    title       varchar(120) NOT NULL,
    sort_order  int NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at  timestamptz
);

CREATE INDEX IF NOT EXISTS ix_duty_designations_module_active
    ON public.duty_designations (module, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS ux_duty_designations_module_title
    ON public.duty_designations (module, lower(trim(title)));

ALTER TABLE public.duty_designations
    DROP CONSTRAINT IF EXISTS duty_designations_module_check;

ALTER TABLE public.duty_designations
    ADD CONSTRAINT duty_designations_module_check
    CHECK (module IN ('security', 'housekeeping'));

-- Seed defaults (idempotent).
INSERT INTO public.duty_designations (module, title, sort_order)
SELECT v.module, v.title, v.sort_order
FROM (
    VALUES
        ('housekeeping', 'Facility Manager', 1),
        ('housekeeping', 'Assistant Facility Manager', 2),
        ('housekeeping', 'CRM / Accountant', 3),
        ('housekeeping', 'Front Office Exe / Helpdesk', 4),
        ('housekeeping', 'Housekeeping Supervisor', 5),
        ('housekeeping', 'Housekeeping Staff', 6),
        ('housekeeping', 'Gardener', 7),
        ('housekeeping', 'Electrician', 8),
        ('housekeeping', 'Plumber', 9),
        ('housekeeping', 'STP/WTP/Pool Operator', 10),
        ('security', 'Security Supervisor', 1),
        ('security', 'Main Gate Guard', 2),
        ('security', 'Tower Guards', 3),
        ('security', 'Lady Guards', 4)
) AS v(module, title, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.duty_designations LIMIT 1);
