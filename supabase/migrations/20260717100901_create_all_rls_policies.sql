-- Migration: Create all Row Level Security policies
-- Tasks 10.2-10.7: RLS policies for all roles
-- Roles: data_engineer, data_analyst, operations_manager, project_manager, executive, external_auditor

-- ============================================================================
-- TASK 10.2: DATA ENGINEER - Full read/write access to all tables
-- ============================================================================

CREATE POLICY data_engineer_all ON order_tracking.ethernet_orders
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.ocn_orders
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.ds1_orders
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.ds3_orders
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.project_orders
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.order_status_history
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.alerts
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.data_quality_log
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.source_system_freshness
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.project_order_links
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');
CREATE POLICY data_engineer_all ON order_tracking.cycle_time_targets
  FOR ALL USING (order_tracking.get_user_role() = 'data_engineer');

-- ============================================================================
-- TASK 10.3: DATA ANALYST - Read-only access to order data
-- ============================================================================

CREATE POLICY data_analyst_read ON order_tracking.ethernet_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.ocn_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.ds1_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.ds3_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.project_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.order_status_history
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.project_order_links
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');
CREATE POLICY data_analyst_read ON order_tracking.cycle_time_targets
  FOR SELECT USING (order_tracking.get_user_role() = 'data_analyst');

-- ============================================================================
-- TASK 10.4: OPERATIONS MANAGER - Read orders/history, full alerts, read freshness
-- ============================================================================

CREATE POLICY ops_manager_read ON order_tracking.ethernet_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_read ON order_tracking.ocn_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_read ON order_tracking.ds1_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_read ON order_tracking.ds3_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_read ON order_tracking.project_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_read ON order_tracking.order_status_history
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_alerts ON order_tracking.alerts
  FOR ALL USING (order_tracking.get_user_role() = 'operations_manager');
CREATE POLICY ops_manager_read ON order_tracking.source_system_freshness
  FOR SELECT USING (order_tracking.get_user_role() = 'operations_manager');

-- ============================================================================
-- TASK 10.5: PROJECT MANAGER - Scoped to own projects and linked child orders
-- ============================================================================

CREATE POLICY pm_read_projects ON order_tracking.project_orders
  FOR SELECT USING (
    order_tracking.get_user_role() = 'project_manager'
    AND project_manager_id = order_tracking.get_user_id()
  );
CREATE POLICY pm_read_links ON order_tracking.project_order_links
  FOR SELECT USING (
    order_tracking.get_user_role() = 'project_manager'
    AND project_id IN (
      SELECT project_id FROM order_tracking.project_orders
      WHERE project_manager_id = order_tracking.get_user_id()
    )
  );
-- PM can see child orders linked to their projects
CREATE POLICY pm_read_ethernet ON order_tracking.ethernet_orders
  FOR SELECT USING (
    order_tracking.get_user_role() = 'project_manager'
    AND order_id IN (
      SELECT pol.order_id FROM order_tracking.project_order_links pol
      JOIN order_tracking.project_orders po ON pol.project_id = po.project_id
      WHERE po.project_manager_id = order_tracking.get_user_id()
        AND pol.service_type = 'ethernet'
    )
  );
CREATE POLICY pm_read_ocn ON order_tracking.ocn_orders
  FOR SELECT USING (
    order_tracking.get_user_role() = 'project_manager'
    AND order_id IN (
      SELECT pol.order_id FROM order_tracking.project_order_links pol
      JOIN order_tracking.project_orders po ON pol.project_id = po.project_id
      WHERE po.project_manager_id = order_tracking.get_user_id()
        AND pol.service_type = 'ocn'
    )
  );
CREATE POLICY pm_read_ds1 ON order_tracking.ds1_orders
  FOR SELECT USING (
    order_tracking.get_user_role() = 'project_manager'
    AND order_id IN (
      SELECT pol.order_id FROM order_tracking.project_order_links pol
      JOIN order_tracking.project_orders po ON pol.project_id = po.project_id
      WHERE po.project_manager_id = order_tracking.get_user_id()
        AND pol.service_type = 'ds1'
    )
  );
CREATE POLICY pm_read_ds3 ON order_tracking.ds3_orders
  FOR SELECT USING (
    order_tracking.get_user_role() = 'project_manager'
    AND order_id IN (
      SELECT pol.order_id FROM order_tracking.project_order_links pol
      JOIN order_tracking.project_orders po ON pol.project_id = po.project_id
      WHERE po.project_manager_id = order_tracking.get_user_id()
        AND pol.service_type = 'ds3'
    )
  );

-- ============================================================================
-- TASK 10.6: EXECUTIVE - Read-only on project_orders, history, alerts
-- ============================================================================

CREATE POLICY executive_read_projects ON order_tracking.project_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'executive');
CREATE POLICY executive_read_history ON order_tracking.order_status_history
  FOR SELECT USING (order_tracking.get_user_role() = 'executive');
CREATE POLICY executive_read_alerts ON order_tracking.alerts
  FOR SELECT USING (order_tracking.get_user_role() = 'executive');

-- ============================================================================
-- TASK 10.7: EXTERNAL AUDITOR - Read order tables and history
-- ============================================================================

CREATE POLICY auditor_read ON order_tracking.ethernet_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'external_auditor');
CREATE POLICY auditor_read ON order_tracking.ocn_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'external_auditor');
CREATE POLICY auditor_read ON order_tracking.ds1_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'external_auditor');
CREATE POLICY auditor_read ON order_tracking.ds3_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'external_auditor');
CREATE POLICY auditor_read ON order_tracking.project_orders
  FOR SELECT USING (order_tracking.get_user_role() = 'external_auditor');
CREATE POLICY auditor_read ON order_tracking.order_status_history
  FOR SELECT USING (order_tracking.get_user_role() = 'external_auditor');
