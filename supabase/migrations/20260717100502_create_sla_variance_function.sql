-- Migration: Create calculate_sla_variance() function
-- Returns signed day difference: positive = late, negative = early

CREATE OR REPLACE FUNCTION order_tracking.calculate_sla_variance(
  p_order_id TEXT,
  p_service_type order_tracking.service_type
)
RETURNS INTEGER
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_committed TIMESTAMPTZ;
  v_actual TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Fetch dates based on service type
  CASE p_service_type
    WHEN 'ethernet' THEN
      SELECT committed_due_date, actual_completion_date
      INTO v_committed, v_actual
      FROM order_tracking.ethernet_orders WHERE order_id = p_order_id;
    WHEN 'ocn' THEN
      SELECT committed_due_date, actual_completion_date
      INTO v_committed, v_actual
      FROM order_tracking.ocn_orders WHERE order_id = p_order_id;
    WHEN 'ds1' THEN
      SELECT committed_due_date, actual_completion_date
      INTO v_committed, v_actual
      FROM order_tracking.ds1_orders WHERE order_id = p_order_id;
    WHEN 'ds3' THEN
      SELECT committed_due_date, actual_completion_date
      INTO v_committed, v_actual
      FROM order_tracking.ds3_orders WHERE order_id = p_order_id;
    WHEN 'project_management' THEN
      SELECT committed_due_date, actual_completion_date
      INTO v_committed, v_actual
      FROM order_tracking.project_orders WHERE project_id = p_order_id;
  END CASE;

  -- Return NULL if no committed date
  IF v_committed IS NULL THEN
    RETURN NULL;
  END IF;

  -- Use actual completion date or now() as end date
  v_end_date := COALESCE(v_actual, now());

  -- Positive = late, Negative = early
  RETURN (v_end_date::DATE - v_committed::DATE);
END;
$$;
