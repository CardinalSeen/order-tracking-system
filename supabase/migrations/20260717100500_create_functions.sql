-- Migration: Create database functions
-- This migration creates the normalize_status() function.
-- Additional functions will be added in subsequent tasks.

CREATE OR REPLACE FUNCTION order_tracking.normalize_status(
  p_service_type order_tracking.service_type,
  p_raw_status TEXT
)
RETURNS order_tracking.canonical_order_status
LANGUAGE plpgsql VOLATILE
AS $$
BEGIN
  CASE p_service_type
    WHEN 'ethernet' THEN
      CASE p_raw_status
        WHEN 'Submitted' THEN RETURN 'RECEIVED';
        WHEN 'In Design' THEN RETURN 'DESIGN';
        WHEN 'Provisioning' THEN RETURN 'IN_PROGRESS';
        WHEN 'Testing' THEN RETURN 'TESTING';
        WHEN 'Complete' THEN RETURN 'COMPLETE';
        WHEN 'Cancelled' THEN RETURN 'CANCELLED';
        ELSE NULL;
      END CASE;
    WHEN 'ocn' THEN
      CASE p_raw_status
        WHEN 'Submitted' THEN RETURN 'RECEIVED';
        WHEN 'Engineering' THEN RETURN 'DESIGN';
        WHEN 'Provisioning' THEN RETURN 'IN_PROGRESS';
        WHEN 'Turn-Up' THEN RETURN 'TESTING';
        WHEN 'Testing' THEN RETURN 'TESTING';
        WHEN 'Complete' THEN RETURN 'COMPLETE';
        WHEN 'Cancelled' THEN RETURN 'CANCELLED';
        ELSE NULL;
      END CASE;
    WHEN 'ds1', 'ds3' THEN
      CASE p_raw_status
        WHEN 'Submitted' THEN RETURN 'RECEIVED';
        WHEN 'Facility Assignment' THEN RETURN 'DESIGN';
        WHEN 'Provisioning' THEN RETURN 'IN_PROGRESS';
        WHEN 'Testing' THEN RETURN 'TESTING';
        WHEN 'Complete' THEN RETURN 'COMPLETE';
        WHEN 'Cancelled' THEN RETURN 'CANCELLED';
        ELSE NULL;
      END CASE;
    WHEN 'project_management' THEN
      CASE p_raw_status
        WHEN 'Initiated' THEN RETURN 'RECEIVED';
        WHEN 'Planning' THEN RETURN 'DESIGN';
        WHEN 'In Progress' THEN RETURN 'IN_PROGRESS';
        WHEN 'UAT' THEN RETURN 'TESTING';
        WHEN 'Complete' THEN RETURN 'COMPLETE';
        WHEN 'On Hold' THEN RETURN 'ON_HOLD';
        WHEN 'Cancelled' THEN RETURN 'CANCELLED';
        ELSE NULL;
      END CASE;
  END CASE;

  -- If we reach here, the status was not recognized.
  -- Log the unrecognized status to the data_quality_log table.
  INSERT INTO order_tracking.data_quality_log (service_type, field_name, violation_type, violation_detail)
  VALUES (p_service_type, 'order_status', 'unrecognized_status', p_raw_status);

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION order_tracking.normalize_status(order_tracking.service_type, TEXT) IS
  'Maps service-specific order statuses to the canonical status taxonomy. '
  'Logs unrecognized statuses to data_quality_log and returns NULL for unknown values.';
