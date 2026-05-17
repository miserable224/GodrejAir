-- Deployment audit logs with photo URLs (mobile daily deployment modal).
CREATE TABLE IF NOT EXISTS security_deployment_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    log_date date NOT NULL,
    designation varchar(100),
    staff_name varchar(200) NOT NULL,
    location_name varchar(200) NOT NULL,
    staff_id uuid REFERENCES security_staff(id) ON DELETE SET NULL,
    location_id uuid REFERENCES security_locations(id) ON DELETE SET NULL,
    latitude double precision,
    longitude double precision,
    accuracy_meters double precision,
    photo_captured_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_security_deployment_logs_log_date
    ON security_deployment_logs (log_date DESC);

CREATE TABLE IF NOT EXISTS security_deployment_photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_log_id uuid NOT NULL REFERENCES security_deployment_logs(id) ON DELETE CASCADE,
    photo_url varchar(2000) NOT NULL,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_security_deployment_photos_log_id
    ON security_deployment_photos (deployment_log_id);
