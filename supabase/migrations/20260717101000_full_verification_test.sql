-- Full Deployment Verification Test
-- This migration verifies end-to-end correctness then cleans up.

DO $$
DECLARE
  v_history_count INTEGER;
  v_unified_count INTEGER;
  v_rollup_count INTEGER;
  v_canonical order_tracking.canonical_order_status;
  v_bdays INTEGER;
BEGIN
  -- 1. Insert test orders across multiple service types
  INSERT INTO order_tracking.ethernet_orders (order_id, order_type, customer_id, order_status, bandwidth_mbps, committed_due_date)
  VALUES ('VERIFY-ETH-001', 'New', 'CUST-VERIFY', 'Submitted', 100, now() + interval '30 days');

  INSERT INTO order_tracking.ocn_orders (order_id, order_type, customer_id, order_status, ocn_rate)
  VALUES ('VERIFY-OCN-001', 'New', 'CUST-VERIFY', 'Submitted', 'OC-12');

  INSERT INTO order_tracking.ds1_orders (order_id, order_type, customer_id, order_status)
  VALUES ('VERIFY-DS1-001', 'New', 'CUST-VERIFY', 'Submitted');

  INSERT INTO order_tracking.project_orders (project_id, project_name, project_type, customer_id, project_status, total_sites, sites_completed, project_manager_id)
  VALUES ('VERIFY-PROJ-001', 'Verification Project', 'Multi-Site', 'CUST-VERIFY', 'Initiated', 3, 0, 'PM-001');

  -- 2. Update statuses (triggers SCD Type 2)
  UPDATE order_tracking.ethernet_orders SET order_status = 'In Design' WHERE order_id = 'VERIFY-ETH-001';
  UPDATE order_tracking.ethernet_orders SET order_status = 'Provisioning' WHERE order_id = 'VERIFY-ETH-001';
  UPDATE order_tracking.ocn_orders SET order_status = 'Engineering' WHERE order_id = 'VERIFY-OCN-001';
  UPDATE order_tracking.project_orders SET project_status = 'Planning' WHERE project_id = 'VERIFY-PROJ-001';

  -- 3. Link orders to project
  INSERT INTO order_tracking.project_order_links (project_id, service_type, order_id)
  VALUES ('VERIFY-PROJ-001', 'ethernet', 'VERIFY-ETH-001'),
         ('VERIFY-PROJ-001', 'ocn', 'VERIFY-OCN-001'),
         ('VERIFY-PROJ-001', 'ds1', 'VERIFY-DS1-001');

  -- 4. Verify order_status_history
  SELECT COUNT(*) INTO v_history_count
  FROM order_tracking.order_status_history
  WHERE order_id IN ('VERIFY-ETH-001', 'VERIFY-OCN-001', 'VERIFY-DS1-001', 'VERIFY-PROJ-001');

  IF v_history_count < 4 THEN
    RAISE EXCEPTION 'History verification failed: expected >= 4 records, got %', v_history_count;
  END IF;

  -- 5. Verify unified_orders_view
  SELECT COUNT(*) INTO v_unified_count
  FROM order_tracking.unified_orders_view
  WHERE customer_id = 'CUST-VERIFY';

  IF v_unified_count != 4 THEN
    RAISE EXCEPTION 'Unified view verification failed: expected 4 orders, got %', v_unified_count;
  END IF;

  -- 6. Verify canonical status mapping
  SELECT canonical_status INTO v_canonical
  FROM order_tracking.unified_orders_view
  WHERE order_id = 'VERIFY-ETH-001';

  IF v_canonical != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Status normalization failed: expected IN_PROGRESS, got %', v_canonical;
  END IF;

  -- 7. Verify project_rollup_view
  SELECT COUNT(*) INTO v_rollup_count
  FROM order_tracking.project_rollup_view
  WHERE project_id = 'VERIFY-PROJ-001';

  IF v_rollup_count != 1 THEN
    RAISE EXCEPTION 'Project rollup verification failed: expected 1, got %', v_rollup_count;
  END IF;

  -- 8. Verify calculate_business_days
  v_bdays := order_tracking.calculate_business_days(
    '2026-07-14 00:00:00+00'::timestamptz,  -- Monday
    '2026-07-18 00:00:00+00'::timestamptz   -- Friday
  );
  IF v_bdays != 4 THEN
    RAISE EXCEPTION 'Business days calculation failed: expected 4, got %', v_bdays;
  END IF;

  -- 9. Verify normalize_status returns correct values
  IF order_tracking.normalize_status('ethernet', 'Submitted') != 'RECEIVED' THEN
    RAISE EXCEPTION 'normalize_status ethernet/Submitted failed';
  END IF;
  IF order_tracking.normalize_status('ocn', 'Turn-Up') != 'TESTING' THEN
    RAISE EXCEPTION 'normalize_status ocn/Turn-Up failed';
  END IF;
  IF order_tracking.normalize_status('project_management', 'On Hold') != 'ON_HOLD' THEN
    RAISE EXCEPTION 'normalize_status project_management/On Hold failed';
  END IF;

  -- CLEANUP: Remove all test data
  DELETE FROM order_tracking.project_order_links WHERE project_id = 'VERIFY-PROJ-001';
  DELETE FROM order_tracking.order_status_history WHERE order_id IN ('VERIFY-ETH-001', 'VERIFY-OCN-001', 'VERIFY-DS1-001', 'VERIFY-PROJ-001');
  DELETE FROM order_tracking.ethernet_orders WHERE order_id = 'VERIFY-ETH-001';
  DELETE FROM order_tracking.ocn_orders WHERE order_id = 'VERIFY-OCN-001';
  DELETE FROM order_tracking.ds1_orders WHERE order_id = 'VERIFY-DS1-001';
  DELETE FROM order_tracking.project_orders WHERE project_id = 'VERIFY-PROJ-001';

  RAISE NOTICE 'ALL VERIFICATION TESTS PASSED';
END $$;
