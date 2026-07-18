-- Migration: Create auditor_orders_view
-- Purpose: Provides an auditor-facing view that masks PII (customer_id)
-- while exposing only non-sensitive order tracking columns.
-- Requirement: 6.7

CREATE OR REPLACE VIEW order_tracking.auditor_orders_view AS
SELECT
  order_id,
  service_type,
  canonical_status,
  'MASKED-' || LEFT(MD5(customer_id), 8) AS customer_id_masked,
  a_location_clli,
  z_location_clli,
  created_at,
  updated_at
FROM order_tracking.unified_orders_view;
