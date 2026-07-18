-- Migration: Create unified_orders_view
-- Purpose: UNION ALL across all 5 service order tables with canonical status normalization

CREATE OR REPLACE VIEW order_tracking.unified_orders_view AS
SELECT
  id,
  order_id,
  'ethernet'::order_tracking.service_type AS service_type,
  order_type,
  customer_id,
  order_status::TEXT AS raw_status,
  order_tracking.normalize_status('ethernet', order_status::TEXT) AS canonical_status,
  a_location_clli,
  z_location_clli,
  requested_due_date,
  committed_due_date,
  actual_completion_date,
  created_at,
  updated_at
FROM order_tracking.ethernet_orders

UNION ALL

SELECT
  id,
  order_id,
  'ocn'::order_tracking.service_type AS service_type,
  order_type,
  customer_id,
  order_status::TEXT AS raw_status,
  order_tracking.normalize_status('ocn', order_status::TEXT) AS canonical_status,
  a_location_clli,
  z_location_clli,
  requested_due_date,
  committed_due_date,
  actual_completion_date,
  created_at,
  updated_at
FROM order_tracking.ocn_orders

UNION ALL

SELECT
  id,
  order_id,
  'ds1'::order_tracking.service_type AS service_type,
  order_type,
  customer_id,
  order_status::TEXT AS raw_status,
  order_tracking.normalize_status('ds1', order_status::TEXT) AS canonical_status,
  a_location_clli,
  z_location_clli,
  requested_due_date,
  committed_due_date,
  actual_completion_date,
  created_at,
  updated_at
FROM order_tracking.ds1_orders

UNION ALL

SELECT
  id,
  order_id,
  'ds3'::order_tracking.service_type AS service_type,
  order_type,
  customer_id,
  order_status::TEXT AS raw_status,
  order_tracking.normalize_status('ds3', order_status::TEXT) AS canonical_status,
  a_location_clli,
  z_location_clli,
  requested_due_date,
  committed_due_date,
  actual_completion_date,
  created_at,
  updated_at
FROM order_tracking.ds3_orders

UNION ALL

SELECT
  id,
  project_id AS order_id,
  'project_management'::order_tracking.service_type AS service_type,
  NULL::order_tracking.order_type AS order_type,
  customer_id,
  project_status::TEXT AS raw_status,
  order_tracking.normalize_status('project_management', project_status::TEXT) AS canonical_status,
  NULL AS a_location_clli,
  NULL AS z_location_clli,
  requested_due_date,
  committed_due_date,
  actual_completion_date,
  created_at,
  updated_at
FROM order_tracking.project_orders;
