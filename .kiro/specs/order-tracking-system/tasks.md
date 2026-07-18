# Implementation Plan: Order Tracking System

## Overview

The implementation is structured as sequential Supabase migrations applied via `supabase db push` or `supabase migration up`. Each task produces one SQL migration file in `supabase/migrations/`. Tasks build on each other — schema first, then tables, then functions, triggers, views, indexes, RLS, and finally data quality infrastructure.

All SQL lives in the `order_tracking` schema. Migrations are named with timestamps for ordering.

## Tasks

- [x] 1. Create schema and enum types
  - [x] 1.1 Create migration file for schema and all enum types
    - Create `supabase/migrations/<timestamp>_create_schema_and_enums.sql`
    - Create `order_tracking` schema
    - Define all enum types: service_type, canonical_order_status, ethernet_order_status, ocn_order_status, ds1_ds3_order_status, project_status, order_type, ethernet_service_subtype, port_speed, cos_profile, ocn_rate, protection_type, ds1_framing_type, line_coding, ds1_channelization, ds3_framing_type, ds3_channel_config, project_type, priority_level, alert_type, severity_level
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 2. Create service order tables
  - [x] 2.1 Create migration file for all 5 service order tables
    - Create `supabase/migrations/<timestamp>_create_order_tables.sql`
    - Create ethernet_orders table with all columns, constraints, and CHECK constraints
    - Create ocn_orders table with all columns and constraints
    - Create ds1_orders table with all columns and constraints
    - Create ds3_orders table with all columns and constraints
    - Create project_orders table with all columns, constraints, and sites_completed <= total_sites CHECK
    - All tables use UUID primary key, TEXT business keys, timestamptz timestamps
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.2, 8.3, 8.4_

- [x] 3. Create supporting tables (history, links, data quality, alerts)
  - [x] 3.1 Create migration file for order_status_history table
    - Create `supabase/migrations/<timestamp>_create_history_and_support_tables.sql`
    - Create order_status_history table with SCD Type 2 columns (id, service_type, order_id, previous_status, new_status, canonical_status, changed_at, changed_by, effective_from, effective_to, is_current)
    - _Requirements: 4.1_

  - [x] 3.2 Create project_order_links junction table
    - Create project_order_links with FK to project_orders(project_id)
    - Add UNIQUE constraint on (project_id, service_type, order_id)
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 3.3 Create data quality and alerting tables
    - Create data_quality_log table
    - Create source_system_freshness table
    - Create alerts table
    - Create cycle_time_targets table with seed data
    - _Requirements: 8.6, 8.7, 11.1, 11.2, 11.3, 5.5_

- [x] 4. Checkpoint - Verify schema structure
  - Run `supabase db push` to apply migrations to remote database
  - Ensure all tables and enums are created without errors
  - Verify with a quick SELECT from information_schema

- [x] 5. Create database functions
  - [x] 5.1 Create normalize_status() function
    - Create `supabase/migrations/<timestamp>_create_functions.sql`
    - Implement normalize_status(service_type, raw_status) with all mappings per PRD taxonomy
    - Log unrecognized statuses to data_quality_log
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1_

  - [x] 5.2 Create calculate_business_days() function
    - Implement calculate_business_days(start_date, end_date) excluding weekends
    - Handle NULL inputs gracefully
    - _Requirements: 5.1, 5.2, 7.2_

  - [x] 5.3 Create calculate_sla_variance() function
    - Implement calculate_sla_variance(order_id, service_type)
    - Return signed day difference (positive = late)
    - _Requirements: 5.3, 7.3_

  - [x] 5.4 Create check_sla_breach_risk() function
    - Implement check_sla_breach_risk(order_id, service_type)
    - Check against committed date and 80% of cycle time target
    - _Requirements: 5.7, 7.4_

  - [x] 5.5 Create record_status_change() function
    - Implement SCD Type 2 pattern: close current record, insert new record
    - Call normalize_status() for canonical_status
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 7.5_

  - [x] 5.6 Create get_cycle_time_target() function
    - Implement get_cycle_time_target(service_type, order_type)
    - _Requirements: 5.5, 7.6_

  - [x] 5.7 Create refresh_sla_metrics() function
    - Implement REFRESH MATERIALIZED VIEW CONCURRENTLY
    - _Requirements: 7.7_

- [x] 6. Create triggers for SCD Type 2 automation
  - [x] 6.1 Create trigger function and attach to all order tables
    - Create `supabase/migrations/<timestamp>_create_triggers.sql`
    - Create trigger_status_change() function that detects table name and extracts old/new status
    - Create BEFORE UPDATE triggers on ethernet_orders, ocn_orders, ds1_orders, ds3_orders, project_orders
    - Trigger fires only when status column actually changes
    - Auto-updates updated_at timestamp on status change
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7. Checkpoint - Verify functions and triggers
  - Run `supabase db push` to apply function and trigger migrations
  - Test by inserting a sample order and updating its status
  - Verify order_status_history record is created automatically
  - Ensure all tests pass, ask the user if questions arise

- [x] 8. Create views and materialized views
  - [x] 8.1 Create unified_orders_view
    - Create `supabase/migrations/<timestamp>_create_views.sql`
    - UNION ALL across all 5 service tables
    - Include canonical status via normalize_status() call
    - _Requirements: 3.6_

  - [x] 8.2 Create project_rollup_view
    - JOIN project_orders with project_order_links and unified_orders_view
    - Aggregate child order counts by canonical status
    - _Requirements: 10.3, 10.4_

  - [x] 8.3 Create sla_metrics materialized view
    - Compute days_in_current_status, cycle_time, sla_variance_days, breach_risk
    - Create unique index for CONCURRENTLY refresh support
    - _Requirements: 5.4_

  - [x] 8.4 Create auditor_orders_view
    - Mask customer_id with MD5 hash prefix
    - Expose only non-PII columns
    - _Requirements: 6.7_

- [x] 9. Create performance indexes
  - [x] 9.1 Create all indexes in a single migration
    - Create `supabase/migrations/<timestamp>_create_indexes.sql`
    - Status indexes on all order tables
    - Customer_id indexes on all order tables
    - Created_at indexes on all order tables
    - Committed_due_date indexes on all order tables
    - Composite index on order_status_history (service_type, order_id)
    - Partial index on order_status_history (is_current) WHERE is_current = true
    - Project_order_links indexes
    - Alerts indexes
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 10. Create Row Level Security policies
  - [x] 10.1 Create RLS helper functions and enable RLS
    - Create `supabase/migrations/<timestamp>_create_rls_policies.sql`
    - Create get_user_role() and get_user_id() helper functions
    - Enable RLS on all tables
    - _Requirements: 6.1_

  - [x] 10.2 Create data_engineer policies (full access)
    - FOR ALL policies on every table
    - _Requirements: 6.2_

  - [x] 10.3 Create data_analyst policies (read-only)
    - FOR SELECT policies on order tables, history, links, targets
    - _Requirements: 6.3_

  - [x] 10.4 Create operations_manager policies
    - FOR SELECT on order tables and history
    - FOR ALL on alerts table
    - FOR SELECT on source_system_freshness
    - _Requirements: 6.4_

  - [x] 10.5 Create project_manager scoped policies
    - FOR SELECT on project_orders WHERE project_manager_id matches user
    - FOR SELECT on project_order_links for owned projects
    - FOR SELECT on service order tables for linked orders only
    - _Requirements: 6.5_

  - [x] 10.6 Create executive policies (aggregate views)
    - FOR SELECT on project_orders, history, alerts
    - _Requirements: 6.6_

  - [x] 10.7 Create external_auditor policies
    - FOR SELECT on order tables and history (access through auditor_orders_view for masking)
    - _Requirements: 6.7_

- [x] 11. Checkpoint - Full deployment verification
  - Run `supabase db push` to apply all remaining migrations
  - Verify all objects exist in the order_tracking schema
  - Test a complete workflow: insert order → update status → check history → check unified view → check sla_metrics
  - Ensure all tests pass, ask the user if questions arise

- [ ]* 12. Write property tests for core functions
  - [ ]* 12.1 Write property test for normalize_status determinism
    - **Property 1: Status Normalization Determinism**
    - For all valid (service_type, raw_status) pairs, normalize_status returns consistent results
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 12.2 Write property test for business day calculation monotonicity
    - **Property 2: Business Day Calculation Monotonicity**
    - For any two date ranges with same start and end2 > end1, result2 >= result1
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 12.3 Write property test for SCD Type 2 single-current invariant
    - **Property 3: SCD Type 2 Single-Current Invariant**
    - After any number of status updates, exactly one is_current=true per order
    - **Validates: Requirements 4.2, 4.3, 4.5**

  - [ ]* 12.4 Write property test for unified view canonical mapping
    - **Property 5: Unified View Canonical Mapping Consistency**
    - For any order in unified_orders_view, canonical_status matches normalize_status output
    - **Validates: Requirements 3.6, 7.1**

  - [ ]* 12.5 Write property test for constraint enforcement
    - **Property 6: Constraint Enforcement on Invalid Data**
    - For any invalid enum value or CHECK violation, the operation is rejected
    - **Validates: Requirements 2.10, 8.1, 8.2, 8.3, 8.4**

  - [ ]* 12.6 Write property test for project rollup consistency
    - **Property 7: Project Rollup Reflects Child Status Changes**
    - After child order status change, project_rollup_view reflects updated counts
    - **Validates: Requirements 10.3, 10.4**

- [x] 13. Final checkpoint
  - Ensure all migrations apply cleanly to the remote Supabase instance
  - Verify schema completeness against requirements
  - Ensure all tests pass, ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    {"tasks": ["1"]},
    {"tasks": ["2"]},
    {"tasks": ["3"]},
    {"tasks": ["4"]},
    {"tasks": ["5"]},
    {"tasks": ["6"]},
    {"tasks": ["7"]},
    {"tasks": ["8", "9"]},
    {"tasks": ["10"]},
    {"tasks": ["11"]},
    {"tasks": ["12"]},
    {"tasks": ["13"]}
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each migration file should be idempotent where possible (use IF NOT EXISTS, OR REPLACE)
- Migration timestamps should use format `YYYYMMDDHHMMSS` (Supabase CLI convention)
- Run `supabase db push` after each logical group of migrations to catch errors early
- The service role (used by backend ingestion) bypasses RLS — no special policy needed for data loading
