-- Migration: Create check_sla_breach_risk() function
-- Returns TRUE if an order is at risk of breaching its SLA target

CREATE OR REPLACE FUNCTION order_tracking.check_sla_breach_risk(
  p_order_id TEXT,
  p_service_type order_tracking.service_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_committed TIMESTAMPTZ;
  v_actual TIMESTAMPTZ;
  v_created TIMESTAMPTZ;
  v_target_days INTEGER;
  v_elapsed_days INTEGER;
  v_order_type order_tracking.order_type;
BEGIN
  -- Fetch order details based on service type
  CASE p_service_type
    WHEN 'ethernet' THEN
      SELECT committed_due_date, actual_completion_date, created_at, order_type
      INTO v_committed, v_actual, v_created, v_order_type
      FROM order_tracking.ethernet_orders WHERE order_id = p_order_id;
    WHEN 'ocn' THEN
      SELECT committed_due_date, actual_completion_date, created_at, order_type
      INTO v_committed, v_actual, v_created, v_order_type
      FROM order_tracking.ocn_orders WHERE order_id = p_order_id;
    WHEN 'ds1' THEN
      SELECT committed_due_date, actual_completion_date, created_at, order_type
      INTO v_committed, v_actual, v_created, v_order_type
      FROM order_tracking.ds1_orders WHERE order_id = p_order_id;
    WHEN 'ds3' THEN
      SELECT committed_due_date, actual_completion_date, created_at, order_type
      INTO v_committed, v_actual, v_created, v_order_type
      FROM order_tracking.ds3_orders WHERE order_id = p_order_id;
    ELSE
      -- Returns FALSE for project_management or any unknown service type
      RETURN FALSE;
  END CASE;

  -- Already completed orders are not at risk
  IF v_actual IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  -- Already past due: if now() > committed_due_date
  IF v_committed IS NOT NULL AND now() > v_committed THEN
    RETURN TRUE;
  END IF;

  -- Check against cycle time target (80% threshold)
  SELECT target_days INTO v_target_days
  FROM order_tracking.cycle_time_targets
  WHERE service_type = p_service_type AND order_type = v_order_type;

  -- No target found means no risk assessment possible
  IF v_target_days IS NOT NULL THEN
    v_elapsed_days := order_tracking.calculate_business_days(v_created, now());
    -- At risk if >80% of target consumed
    IF v_elapsed_days > (v_target_days * 0.8) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;
