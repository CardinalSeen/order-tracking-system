-- Function 7: refresh_sla_metrics()
-- Refreshes the sla_metrics materialized view concurrently.
CREATE OR REPLACE FUNCTION order_tracking.refresh_sla_metrics()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY order_tracking.sla_metrics;
END;
$$;
