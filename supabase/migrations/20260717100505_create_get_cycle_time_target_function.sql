-- Function 6: get_cycle_time_target()
-- Retrieves the target cycle time in days for a given service type and order type.
CREATE OR REPLACE FUNCTION order_tracking.get_cycle_time_target(
  p_service_type order_tracking.service_type,
  p_order_type order_tracking.order_type
)
RETURNS INTEGER
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_target INTEGER;
BEGIN
  SELECT target_days INTO v_target
  FROM order_tracking.cycle_time_targets
  WHERE service_type = p_service_type
    AND order_type = p_order_type;

  RETURN v_target;
END;
$$;
