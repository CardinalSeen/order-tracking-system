-- Create sla_metrics materialized view
-- Computes SLA-related metrics for all orders with support for CONCURRENTLY refresh

CREATE MATERIALIZED VIEW order_tracking.sla_metrics AS
SELECT
  uov.order_id,
  uov.service_type,
  uov.canonical_status,
  uov.created_at,
  uov.committed_due_date,
  uov.actual_completion_date,
  -- Days in current status
  order_tracking.calculate_business_days(
    h.effective_from, COALESCE(uov.actual_completion_date, now())
  ) AS days_in_current_status,
  -- Cycle time (NULL if not complete)
  CASE WHEN uov.actual_completion_date IS NOT NULL
    THEN order_tracking.calculate_business_days(uov.created_at, uov.actual_completion_date)
    ELSE NULL
  END AS cycle_time,
  -- SLA variance (positive = late, negative = early)
  CASE WHEN uov.committed_due_date IS NOT NULL
    THEN (COALESCE(uov.actual_completion_date, now())::DATE - uov.committed_due_date::DATE)
    ELSE NULL
  END AS sla_variance_days,
  -- Breach risk flag
  order_tracking.check_sla_breach_risk(uov.order_id, uov.service_type) AS breach_risk
FROM order_tracking.unified_orders_view uov
LEFT JOIN order_tracking.order_status_history h
  ON uov.order_id = h.order_id
  AND uov.service_type = h.service_type
  AND h.is_current = true
WITH DATA;

-- Unique index for CONCURRENTLY refresh support
CREATE UNIQUE INDEX idx_sla_metrics_pk
  ON order_tracking.sla_metrics (order_id, service_type);
