-- Performance Indexes for Order Tracking System
-- Covers: status filtering, customer scoping, time-range queries, SLA breach detection,
-- history lookups, project order links, and alerts.

-- ============================================================
-- Status-based filtering (all order tables)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ethernet_status ON order_tracking.ethernet_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_ocn_status ON order_tracking.ocn_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_ds1_status ON order_tracking.ds1_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_ds3_status ON order_tracking.ds3_orders (order_status);
CREATE INDEX IF NOT EXISTS idx_project_status ON order_tracking.project_orders (project_status);

-- ============================================================
-- Customer-scoped queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ethernet_customer ON order_tracking.ethernet_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_ocn_customer ON order_tracking.ocn_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_ds1_customer ON order_tracking.ds1_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_ds3_customer ON order_tracking.ds3_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_project_customer ON order_tracking.project_orders (customer_id);

-- ============================================================
-- Time-range queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ethernet_created ON order_tracking.ethernet_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_ocn_created ON order_tracking.ocn_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_ds1_created ON order_tracking.ds1_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_ds3_created ON order_tracking.ds3_orders (created_at);
CREATE INDEX IF NOT EXISTS idx_project_created ON order_tracking.project_orders (created_at);

-- ============================================================
-- SLA breach detection
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ethernet_committed ON order_tracking.ethernet_orders (committed_due_date);
CREATE INDEX IF NOT EXISTS idx_ocn_committed ON order_tracking.ocn_orders (committed_due_date);
CREATE INDEX IF NOT EXISTS idx_ds1_committed ON order_tracking.ds1_orders (committed_due_date);
CREATE INDEX IF NOT EXISTS idx_ds3_committed ON order_tracking.ds3_orders (committed_due_date);
CREATE INDEX IF NOT EXISTS idx_project_committed ON order_tracking.project_orders (committed_due_date);

-- ============================================================
-- History table lookups
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_history_service_order ON order_tracking.order_status_history (service_type, order_id);
CREATE INDEX IF NOT EXISTS idx_history_is_current ON order_tracking.order_status_history (is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_history_canonical_status ON order_tracking.order_status_history (canonical_status, effective_from);

-- ============================================================
-- Project order links
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pol_project ON order_tracking.project_order_links (project_id);
CREATE INDEX IF NOT EXISTS idx_pol_order ON order_tracking.project_order_links (service_type, order_id);

-- ============================================================
-- Alerts
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_alerts_type ON order_tracking.alerts (alert_type, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_unacked ON order_tracking.alerts (acknowledged_at) WHERE acknowledged_at IS NULL;
