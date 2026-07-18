-- Migration: Create data quality and alerting tables
-- Task 3.3: data_quality_log, source_system_freshness, alerts, cycle_time_targets

-- Data quality log for tracking validation failures and anomalies
CREATE TABLE IF NOT EXISTS order_tracking.data_quality_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type    order_tracking.service_type,
  order_id        TEXT,
  field_name      TEXT NOT NULL,
  violation_type  TEXT NOT NULL,
  violation_detail TEXT,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Source system freshness tracking
CREATE TABLE IF NOT EXISTS order_tracking.source_system_freshness (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system             TEXT NOT NULL UNIQUE,
  last_sync_timestamp       TIMESTAMPTZ,
  expected_interval_minutes INTEGER NOT NULL,
  is_stale                  BOOLEAN NOT NULL DEFAULT false,
  checked_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alerts table for SLA breach risks, stuck orders, and freshness degradation
CREATE TABLE IF NOT EXISTS order_tracking.alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type      order_tracking.alert_type NOT NULL,
  service_type    order_tracking.service_type,
  order_id        TEXT,
  severity        order_tracking.severity_level NOT NULL,
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT
);

-- Cycle time targets reference table
CREATE TABLE IF NOT EXISTS order_tracking.cycle_time_targets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type  order_tracking.service_type NOT NULL,
  order_type    order_tracking.order_type NOT NULL,
  target_days   INTEGER NOT NULL,
  CONSTRAINT uq_cycle_time_target UNIQUE (service_type, order_type)
);

-- Seed cycle time targets
INSERT INTO order_tracking.cycle_time_targets (service_type, order_type, target_days) VALUES
  ('ethernet', 'New', 30),
  ('ethernet', 'Change', 15),
  ('ocn', 'New', 45),
  ('ocn', 'Change', 20),
  ('ds1', 'New', 10),
  ('ds1', 'Change', 5),
  ('ds3', 'New', 15),
  ('ds3', 'Change', 7)
ON CONFLICT ON CONSTRAINT uq_cycle_time_target DO NOTHING;
