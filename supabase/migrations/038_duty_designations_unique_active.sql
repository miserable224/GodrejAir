-- Allow reusing a title after soft-delete; uniqueness applies only to active rows.

DROP INDEX IF EXISTS public.ux_duty_designations_module_title;

CREATE UNIQUE INDEX IF NOT EXISTS ux_duty_designations_module_title_active
    ON public.duty_designations (module, lower(trim(title)))
    WHERE is_active = true;
