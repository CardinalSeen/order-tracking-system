-- Migration: Verify functions and triggers work correctly
-- This migration inserts test data, fires triggers, verifies history records, then cleans up.

-- Test: Insert an order
INSERT INTO order_tracking.ethernet_orders (order_id, order_type, customer_id, order_status)
VALUES ('TEST-ETH-001', 'New', 'CUST-001', 'Submitted');

-- Test: Update status (should fire trigger and create history records)
UPDATE order_tracking.ethernet_orders SET order_status = 'In Design' WHERE order_id = 'TEST-ETH-001';
UPDATE order_tracking.ethernet_orders SET order_status = 'Provisioning' WHERE order_id = 'TEST-ETH-001';

-- Verify: Check history records exist
-- (This will fail the migration if something is wrong)
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM order_tracking.order_status_history WHERE order_id = 'TEST-ETH-001') < 2 THEN
    RAISE EXCEPTION 'Trigger verification failed: expected at least 2 history records for TEST-ETH-001';
  END IF;

  IF (SELECT COUNT(*) FROM order_tracking.order_status_history WHERE order_id = 'TEST-ETH-001' AND is_current = true) != 1 THEN
    RAISE EXCEPTION 'SCD Type 2 invariant violated: expected exactly 1 current record';
  END IF;
END $$;

-- Cleanup test data
DELETE FROM order_tracking.order_status_history WHERE order_id = 'TEST-ETH-001';
DELETE FROM order_tracking.ethernet_orders WHERE order_id = 'TEST-ETH-001';
