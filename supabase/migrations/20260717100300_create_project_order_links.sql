-- Migration: Create project_order_links junction table (M:N relationship)
-- Requirements: 10.1, 10.2, 10.5

CREATE TABLE IF NOT EXISTS order_tracking.project_order_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL REFERENCES order_tracking.project_orders(project_id),
  service_type  order_tracking.service_type NOT NULL,
  order_id      TEXT NOT NULL,
  linked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_project_order_link UNIQUE (project_id, service_type, order_id)
);
