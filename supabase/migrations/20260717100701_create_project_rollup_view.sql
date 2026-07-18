-- Migration: Create project_rollup_view
-- Purpose: Aggregates project orders with linked order status counts from unified_orders_view

CREATE OR REPLACE VIEW order_tracking.project_rollup_view AS
SELECT
  po.project_id,
  po.project_name,
  po.project_type,
  po.project_manager_id,
  po.customer_id,
  po.project_status,
  po.total_sites,
  po.sites_completed,
  po.priority,
  po.requested_due_date,
  po.committed_due_date,
  COUNT(pol.id) AS linked_orders_count,
  COUNT(CASE WHEN uov.canonical_status = 'COMPLETE' THEN 1 END) AS completed_orders,
  COUNT(CASE WHEN uov.canonical_status = 'IN_PROGRESS' THEN 1 END) AS in_progress_orders,
  COUNT(CASE WHEN uov.canonical_status = 'CANCELLED' THEN 1 END) AS cancelled_orders
FROM order_tracking.project_orders po
LEFT JOIN order_tracking.project_order_links pol ON po.project_id = pol.project_id
LEFT JOIN order_tracking.unified_orders_view uov
  ON pol.order_id = uov.order_id AND pol.service_type = uov.service_type
GROUP BY po.project_id, po.project_name, po.project_type,
         po.project_manager_id, po.customer_id, po.project_status,
         po.total_sites, po.sites_completed, po.priority,
         po.requested_due_date, po.committed_due_date;
