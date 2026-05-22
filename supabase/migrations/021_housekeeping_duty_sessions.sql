-- Housekeeping staff check-in / check-out (duty sessions).
CREATE TABLE IF NOT EXISTS housekeeping_duty_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_name varchar(200) NOT NULL,
    location_name varchar(200) NOT NULL,
    designation varchar(100),
    status varchar(20) NOT NULL DEFAULT 'open',
    entry_at timestamptz NOT NULL,
    exit_at timestamptz,
    entry_photo_url varchar(2000),
    exit_photo_url varchar(2000),
    entry_latitude double precision,
    entry_longitude double precision,
    entry_accuracy_meters double precision,
    exit_latitude double precision,
    exit_longitude double precision,
    exit_accuracy_meters double precision,
    entry_captured_at timestamptz,
    exit_captured_at timestamptz,
    entry_shift varchar(20),
    exit_shift varchar(20),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_housekeeping_duty_sessions_status
    ON housekeeping_duty_sessions (status);

CREATE INDEX IF NOT EXISTS ix_housekeeping_duty_sessions_entry_at
    ON housekeeping_duty_sessions (entry_at DESC);

CREATE INDEX IF NOT EXISTS ix_housekeeping_duty_sessions_staff_name_status
    ON housekeeping_duty_sessions (lower(staff_name), status);
