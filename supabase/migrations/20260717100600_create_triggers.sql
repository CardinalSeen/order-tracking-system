-- Migration: Create SCD Type 2 trigger function and attach to all order tables
-- Implements automatic status history tracking via BEFORE UPDATE triggers

-- Generic trigger function for status changes
CREATE OR REPLACE FUNCTION order_tracking.trigger_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_service_type order_tracking.service_type;
  v_order_id TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Determine service type and extract statuses based on firing table
  CASE TG_TABLE_NAME
    WHEN 'ethernet_orders' THEN
      v_service_type := 'ethernet';
      v_order_id := NEW.order_id;
      v_old_status := OLD.order_status::TEXT;
      v_new_status := NEW.order_status::TEXT;
    WHEN 'ocn_orders' THEN
      v_service_type := 'ocn';
      v_order_id := NEW.order_id;
      v_old_status := OLD.order_status::TEXT;
      v_new_status := NEW.order_status::TEXT;
    WHEN 'ds1_orders' THEN
      v_service_type := 'ds1';
      v_order_id := NEW.order_id;
      v_old_status := OLD.order_status::TEXT;
      v_new_status := NEW.order_status::TEXT;
    WHEN 'ds3_orders' THEN
      v_service_type := 'ds3';
      v_order_id := NEW.order_id;
      v_old_status := OLD.order_status::TEXT;
      v_new_status := NEW.order_status::TEXT;
    WHEN 'project_orders' THEN
      v_service_type := 'project_management';
      v_order_id := NEW.project_id;
      v_old_status := OLD.project_status::TEXT;
      v_new_status := NEW.project_status::TEXT;
  END CASE;

  -- Only record if status actually changed
  IF v_old_status IS DISTINCT FROM v_new_status THEN
    PERFORM order_tracking.record_status_change(
      v_service_type, v_order_id, v_old_status, v_new_status, current_user
    );
    -- Update the updated_at timestamp
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Create BEFORE UPDATE triggers on all 5 service order tables

CREATE TRIGGER trg_ethernet_status_change
  BEFORE UPDATE ON order_tracking.ethernet_orders
  FOR EACH ROW EXECUTE FUNCTION order_tracking.trigger_status_change();

CREATE TRIGGER trg_ocn_status_change
  BEFORE UPDATE ON order_tracking.ocn_orders
  FOR EACH ROW EXECUTE FUNCTION order_tracking.trigger_status_change();

CREATE TRIGGER trg_ds1_status_change
  BEFORE UPDATE ON order_tracking.ds1_orders
  FOR EACH ROW EXECUTE FUNCTION order_tracking.trigger_status_change();

CREATE TRIGGER trg_ds3_status_change
  BEFORE UPDATE ON order_tracking.ds3_orders
  FOR EACH ROW EXECUTE FUNCTION order_tracking.trigger_status_change();

CREATE TRIGGER trg_project_status_change
  BEFORE UPDATE ON order_tracking.project_orders
  FOR EACH ROW EXECUTE FUNCTION order_tracking.trigger_status_change();
