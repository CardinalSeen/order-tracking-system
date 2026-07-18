-- Migration: Create RLS helper functions and enable Row Level Security
-- This migration creates utility functions for extracting user role and ID
-- from JWT claims, then enables RLS on all order_tracking tables.
-- Actual policies will be added in subsequent migrations.

-- Helper function: get_user_role()
-- Extracts the app_role claim from the JWT, defaulting to 'anonymous'
CREATE OR REPLACE FUNCTION order_tracking.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'app_role',
    'anonymous'
  );
END;
$$;

-- Helper function: get_user_id()
-- Extracts the sub (subject/user ID) claim from the JWT
CREATE OR REPLACE FUNCTION order_tracking.get_user_id()
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'sub';
END;
$$;

-- Enable Row Level Security on all tables in order_tracking schema
ALTER TABLE order_tracking.ethernet_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.ocn_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.ds1_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.ds3_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.project_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.data_quality_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.source_system_freshness ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.project_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tracking.cycle_time_targets ENABLE ROW LEVEL SECURITY;
