-- Migration: Create record_status_change() function
-- Implements SCD Type 2 pattern for order status history tracking.
-- Closes the current history record and inserts a new one with canonical status.

CREATE OR REPLACE FUNCTION order_tracking.record_status_change(
  p_service_type order_tracking.service_type,
  p_order_id TEXT,
  p_old_status TEXT,
  p_new_status TEXT,
  p_changed_by TEXT DEFAULT 'system'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_canonical order_tracking.canonical_order_status;
BEGIN
  -- Close current history record (SCD Type 2: end-date the active row)
  UPDATE order_tracking.order_status_history
  SET effective_to = now(),
      is_current = false
  WHERE service_type = p_service_type
    AND order_id = p_order_id
    AND is_current = true;

  -- Get canonical status for the new status via normalize_status()
  v_canonical := order_tracking.normalize_status(p_service_type, p_new_status);

  -- Insert new current record
  INSERT INTO order_tracking.order_status_history (
    service_type, order_id, previous_status, new_status,
    canonical_status, changed_at, changed_by,
    effective_from, effective_to, is_current
  ) VALUES (
    p_service_type, p_order_id, p_old_status, p_new_status,
    v_canonical, now(), p_changed_by,
    now(), NULL, true
  );
END;
$$;
