-- Migration: Create order_status_history table (SCD Type 2)
-- Requirements: 4.1

CREATE TABLE IF NOT EXISTS order_tracking.order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type    order_tracking.service_type NOT NULL,
  order_id        TEXT NOT NULL,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  canonical_status order_tracking.canonical_order_status,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by      TEXT,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  is_current      BOOLEAN NOT NULL DEFAULT true
);
