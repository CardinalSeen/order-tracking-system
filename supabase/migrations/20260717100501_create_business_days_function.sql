-- Migration: Create calculate_business_days() function
-- Calculates the number of business days (weekdays) between two timestamps.
-- Excludes weekends (Saturday DOW=6, Sunday DOW=0).
-- Returns NULL if either input is NULL.
-- Marked as IMMUTABLE since it is a pure calculation with no side effects.

CREATE OR REPLACE FUNCTION order_tracking.calculate_business_days(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_days INTEGER := 0;
  v_current DATE;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN NULL;
  END IF;

  v_current := p_start_date::DATE;
  WHILE v_current < p_end_date::DATE LOOP
    -- Exclude Saturday (6) and Sunday (0)
    IF EXTRACT(DOW FROM v_current) NOT IN (0, 6) THEN
      v_days := v_days + 1;
    END IF;
    v_current := v_current + 1;
  END LOOP;

  RETURN v_days;
END;
$$;

COMMENT ON FUNCTION order_tracking.calculate_business_days(TIMESTAMPTZ, TIMESTAMPTZ) IS
  'Calculates the number of business days (weekdays only) between two timestamps. '
  'Excludes Saturday and Sunday. Returns NULL if either input is NULL.';
