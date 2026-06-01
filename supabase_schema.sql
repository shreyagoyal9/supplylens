-- SupplyLens — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ── Table: sensor_readings ────────────────────────────────────────────────────
-- Stores every IoT sensor reading from all shipments.
-- Indexed on shipment_id + timestamp for fast time-range queries.

CREATE TABLE IF NOT EXISTS sensor_readings (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shipment_id     TEXT        NOT NULL,
    shipment_type   TEXT        NOT NULL,           -- pharma | seafood | frozen | dairy
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    temperature     FLOAT       NOT NULL,
    humidity        FLOAT       NOT NULL,
    threshold       FLOAT       NOT NULL,
    is_breach       BOOLEAN     NOT NULL DEFAULT FALSE,
    is_anomaly      BOOLEAN     NOT NULL DEFAULT FALSE,
    anomaly_type    TEXT        NOT NULL DEFAULT 'none',
    origin          TEXT,
    destination     TEXT,
    status          TEXT        NOT NULL DEFAULT 'NORMAL'  -- NORMAL | WARNING | BREACH
);

-- Index for fast per-shipment queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_readings_shipment_time
    ON sensor_readings (shipment_id, timestamp DESC);

-- Index for dashboard anomaly queries
CREATE INDEX IF NOT EXISTS idx_readings_anomaly
    ON sensor_readings (is_anomaly, timestamp DESC)
    WHERE is_anomaly = TRUE;


-- ── Table: alerts ─────────────────────────────────────────────────────────────
-- ML-generated alerts with forecasts and natural-language messages.

CREATE TABLE IF NOT EXISTS alerts (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shipment_id     TEXT        NOT NULL,
    shipment_type   TEXT        NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    anomaly_count   INT         NOT NULL DEFAULT 0,
    will_breach     BOOLEAN     NOT NULL DEFAULT FALSE,
    breach_in_min   INT,                                   -- NULL if no breach predicted
    alert_message   TEXT        NOT NULL,
    forecast        JSONB,                                 -- array of predicted temp values
    severity        TEXT        NOT NULL DEFAULT 'WARNING' -- WARNING | CRITICAL
);

CREATE INDEX IF NOT EXISTS idx_alerts_shipment_time
    ON alerts (shipment_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity
    ON alerts (severity, timestamp DESC);


-- ── Auto-cleanup: keep last 7 days only ──────────────────────────────────────
-- Prevents free-tier storage from filling up.
-- In production, archive to S3 / BigQuery instead of deleting.

-- Run this as a scheduled job in Supabase (Dashboard → Edge Functions → Cron)
-- or uncomment to create a PostgreSQL cron extension job:

-- SELECT cron.schedule(
--   'cleanup-old-readings',
--   '0 2 * * *',   -- every day at 2 AM
--   $$DELETE FROM sensor_readings WHERE timestamp < NOW() - INTERVAL '7 days'$$
-- );

-- SELECT cron.schedule(
--   'cleanup-old-alerts',
--   '0 2 * * *',
--   $$DELETE FROM alerts WHERE timestamp < NOW() - INTERVAL '30 days'$$
-- );


-- ── Disable RLS for this project (re-enable + add policies for production) ────
ALTER TABLE sensor_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          DISABLE ROW LEVEL SECURITY;

-- Done! Copy the Project URL and anon key from:
-- Supabase Dashboard → Settings → API → Project URL / anon public key
