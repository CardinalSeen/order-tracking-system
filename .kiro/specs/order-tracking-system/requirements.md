# Requirements Document

## Introduction

This document specifies the requirements for the Order Tracking System database layer, implemented on Supabase (hosted Postgres). The system provides a unified data platform for tracking telecom service orders across five service types: Ethernet, OCN, DS1, DS3, and Project Management Services. The database layer encompasses schema design, status normalization, SCD Type 2 history tracking, SLA metric calculations, Row Level Security policies, and performance optimization.

## Glossary

- **Order_Tracking_System**: The Supabase Postgres database system that stores, transforms, and serves telecom order data
- **Service_Order**: A request to provision, change, or disconnect a telecom service (Ethernet, OCN, DS1, or DS3)
- **Project_Order**: A Project Management order that coordinates multiple child service orders across service types
- **Canonical_Status**: The unified status taxonomy that normalizes service-specific statuses into a common set (RECEIVED, DESIGN, IN_PROGRESS, TESTING, COMPLETE, ON_HOLD, CANCELLED)
- **SCD_Type_2**: Slowly Changing Dimension Type 2 — a history tracking technique that preserves full history by creating new records with effective date ranges
- **Status_History_Record**: A row in the SCD Type 2 history table representing a single status period for an order
- **SLA_Metric**: A calculated measurement of service level agreement compliance (days in status, cycle time, SLA variance)
- **RLS_Policy**: Row Level Security policy — a Postgres mechanism that restricts row access based on the authenticated user's role
- **CLLI_Code**: Common Language Location Identifier — a standardized code for telecom facility locations
- **Cycle_Time**: The number of business days from order creation to completion
- **SLA_Variance**: The difference in days between actual completion date and committed due date
- **Status_Normalization_Function**: A database function that maps service-specific order statuses to the canonical status taxonomy
- **Alert_Trigger_Function**: A database function that evaluates orders for SLA breach risk and generates alert records
- **Data_Freshness_Tracker**: A mechanism that records when each source system last provided data, enabling staleness detection

## Requirements

### Requirement 1: Service-Specific Order Tables

**User Story:** As a Data Engineer, I want dedicated tables for each service type with appropriate columns and constraints, so that order data from each source system is stored with full fidelity.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL provide an `ethernet_orders` table with columns for order_id, order_type, service_subtype, bandwidth_mbps, port_speed, vlan_id, a_location_clli, z_location_clli, cos_profile, customer_id, order_status, requested_due_date, committed_due_date, actual_completion_date, created_at, and updated_at
2. THE Order_Tracking_System SHALL provide an `ocn_orders` table with columns for order_id, order_type, ocn_rate, circuit_id, ring_id, protection_type, a_location_clli, z_location_clli, customer_id, order_status, requested_due_date, committed_due_date, actual_completion_date, created_at, and updated_at
3. THE Order_Tracking_System SHALL provide a `ds1_orders` table with columns for order_id, order_type, circuit_id, framing_type, line_coding, channelization, a_location_clli, z_location_clli, customer_id, order_status, requested_due_date, committed_due_date, actual_completion_date, created_at, and updated_at
4. THE Order_Tracking_System SHALL provide a `ds3_orders` table with columns for order_id, order_type, circuit_id, framing_type, channel_config, a_location_clli, z_location_clli, customer_id, order_status, requested_due_date, committed_due_date, actual_completion_date, created_at, and updated_at
5. THE Order_Tracking_System SHALL provide a `project_orders` table with columns for project_id, project_name, project_type, project_manager_id, customer_id, total_sites, sites_completed, project_status, priority, requested_due_date, committed_due_date, actual_completion_date, created_at, and updated_at
6. THE Order_Tracking_System SHALL enforce NOT NULL constraints on order_id (or project_id), customer_id, order_status (or project_status), and created_at for all order tables
7. THE Order_Tracking_System SHALL enforce that order_id is unique within each service-specific order table and project_id is unique within the project_orders table

### Requirement 2: Enum Types and Status Taxonomies

**User Story:** As a Data Engineer, I want well-defined Postgres enum types for all categorical fields, so that data integrity is enforced at the database level and invalid values are rejected.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL define a `service_type` enum with values: ethernet, ocn, ds1, ds3, project_management
2. THE Order_Tracking_System SHALL define a `canonical_order_status` enum with values: RECEIVED, DESIGN, IN_PROGRESS, TESTING, COMPLETE, ON_HOLD, CANCELLED
3. THE Order_Tracking_System SHALL define service-specific order status enums: `ethernet_order_status` (Submitted, In Design, Provisioning, Testing, Complete, Cancelled), `ocn_order_status` (Submitted, Engineering, Provisioning, Turn-Up, Testing, Complete, Cancelled), `ds1_ds3_order_status` (Submitted, Facility Assignment, Provisioning, Testing, Complete, Cancelled), `project_status` (Initiated, Planning, In Progress, UAT, Complete, On Hold, Cancelled)
4. THE Order_Tracking_System SHALL define an `order_type` enum with values: New, Change, Disconnect, Upgrade
5. THE Order_Tracking_System SHALL define enums for Ethernet-specific fields: `ethernet_service_subtype` (E-Line, E-LAN, E-Tree, Metro Ethernet), `port_speed` (10M, 100M, 1G, 10G, 100G), `cos_profile` (Real-Time, Business Critical, Standard)
6. THE Order_Tracking_System SHALL define enums for OCN-specific fields: `ocn_rate` (OC-3, OC-12, OC-48, OC-192), `protection_type` (UPSR, BLSR, 1+1, Unprotected)
7. THE Order_Tracking_System SHALL define enums for DS1-specific fields: `ds1_framing_type` (ESF, D4), `line_coding` (AMI, B8ZS), `ds1_channelization` (Channelized, Unchannelized)
8. THE Order_Tracking_System SHALL define enums for DS3-specific fields: `ds3_framing_type` (C-Bit, M13), `ds3_channel_config` (Clear Channel, Channelized)
9. THE Order_Tracking_System SHALL define enums for Project Management fields: `project_type` (Multi-Site, Complex Build, Migration, Custom), `priority_level` (Critical, High, Medium, Low)
10. WHEN an INSERT or UPDATE provides a value not in the defined enum, THEN THE Order_Tracking_System SHALL reject the operation with a constraint violation error

### Requirement 3: Unified Order Status Normalization

**User Story:** As a Data Analyst, I want all service-specific order statuses mapped to a canonical taxonomy, so that I can query and report on order status across all service types uniformly.

#### Acceptance Criteria

1. THE Status_Normalization_Function SHALL map Ethernet status 'Submitted' to canonical status RECEIVED, 'In Design' to DESIGN, 'Provisioning' to IN_PROGRESS, 'Testing' to TESTING, 'Complete' to COMPLETE, and 'Cancelled' to CANCELLED
2. THE Status_Normalization_Function SHALL map OCN status 'Submitted' to RECEIVED, 'Engineering' to DESIGN, 'Provisioning' to IN_PROGRESS, 'Turn-Up' to TESTING, 'Testing' to TESTING, 'Complete' to COMPLETE, and 'Cancelled' to CANCELLED
3. THE Status_Normalization_Function SHALL map DS1/DS3 status 'Submitted' to RECEIVED, 'Facility Assignment' to DESIGN, 'Provisioning' to IN_PROGRESS, 'Testing' to TESTING, 'Complete' to COMPLETE, and 'Cancelled' to CANCELLED
4. THE Status_Normalization_Function SHALL map Project status 'Initiated' to RECEIVED, 'Planning' to DESIGN, 'In Progress' to IN_PROGRESS, 'UAT' to TESTING, 'Complete' to COMPLETE, 'On Hold' to ON_HOLD, and 'Cancelled' to CANCELLED
5. IF the Status_Normalization_Function receives an unrecognized status value, THEN THE Status_Normalization_Function SHALL return NULL and log a warning to an anomaly table
6. THE Order_Tracking_System SHALL provide a `unified_orders_view` that exposes all orders across all service types with their canonical status, enabling cross-service queries

### Requirement 4: SCD Type 2 History Tracking

**User Story:** As a Data Analyst, I want full history of all order status changes preserved with effective date ranges, so that I can analyze order lifecycle patterns and identify bottlenecks.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL provide an `order_status_history` table with columns: id, service_type, order_id, previous_status, new_status, canonical_status, changed_at, changed_by, effective_from, effective_to, and is_current
2. WHEN an order's status changes, THEN THE Order_Tracking_System SHALL close the current history record by setting effective_to to the change timestamp and is_current to false
3. WHEN an order's status changes, THEN THE Order_Tracking_System SHALL create a new history record with the new status, effective_from set to the change timestamp, effective_to set to NULL, and is_current set to true
4. THE Order_Tracking_System SHALL populate the canonical_status column in each history record using the Status_Normalization_Function
5. THE Order_Tracking_System SHALL ensure that for any given order, exactly one history record has is_current set to true at any point in time
6. THE Order_Tracking_System SHALL record the identity of the system or user that triggered the status change in the changed_by column

### Requirement 5: SLA Metrics and Derived Calculations

**User Story:** As an Operations Manager, I want automated calculation of SLA metrics including days in status, cycle time, and SLA variance, so that I can monitor delivery performance and identify at-risk orders.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL provide a function that calculates days_in_current_status as the number of business days between the current status effective_from and the current timestamp
2. THE Order_Tracking_System SHALL provide a function that calculates cycle_time as the number of business days between created_at and actual_completion_date for completed orders
3. THE Order_Tracking_System SHALL provide a function that calculates sla_variance as the difference in days between actual_completion_date (or current date for incomplete orders) and committed_due_date
4. THE Order_Tracking_System SHALL provide an `sla_metrics` materialized view or table that pre-computes days_in_current_status, cycle_time, and sla_variance for all active orders
5. THE Order_Tracking_System SHALL store service-specific cycle time targets: Ethernet New ≤ 30 days, Ethernet Change ≤ 15 days, OCN New ≤ 45 days, OCN Change ≤ 20 days, DS1 New ≤ 10 days, DS1 Change ≤ 5 days, DS3 New ≤ 15 days, DS3 Change ≤ 7 days
6. WHEN an order's days_in_current_status exceeds twice the average for that service type and status, THEN THE Order_Tracking_System SHALL flag the order as a stuck order
7. WHEN an order's projected completion date exceeds the committed_due_date, THEN THE Alert_Trigger_Function SHALL generate an SLA breach risk alert record

### Requirement 6: Row Level Security Policies

**User Story:** As a Data Engineer, I want RLS policies that restrict data access based on user roles, so that each user role sees only the data appropriate to their access level.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL enable Row Level Security on all order tables, the status history table, and the SLA metrics view
2. WHILE a user has the 'data_engineer' role, THE Order_Tracking_System SHALL grant read and write access to all rows in all tables
3. WHILE a user has the 'data_analyst' role, THE Order_Tracking_System SHALL grant read-only access to all rows in the curated/analytics tables and views
4. WHILE a user has the 'operations_manager' role, THE Order_Tracking_System SHALL grant read access to dashboard-relevant views and alert management tables
5. WHILE a user has the 'project_manager' role, THE Order_Tracking_System SHALL grant read access only to project orders and their associated child service orders where the project_manager_id matches the authenticated user's ID
6. WHILE a user has the 'executive' role, THE Order_Tracking_System SHALL grant read access only to aggregate views and summary tables
7. WHILE a user has the 'external_auditor' role, THE Order_Tracking_System SHALL grant read access to historical data with customer_id values masked

### Requirement 7: Database Functions for Key Operations

**User Story:** As a Data Engineer, I want reusable database functions for status normalization, SLA calculation, and alert generation, so that business logic is centralized and consistently applied.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL provide a `normalize_status(service_type, raw_status)` function that returns the canonical_order_status value
2. THE Order_Tracking_System SHALL provide a `calculate_business_days(start_date, end_date)` function that excludes weekends from the day count
3. THE Order_Tracking_System SHALL provide a `calculate_sla_variance(order_id, service_type)` function that returns the signed day difference between target and actual/projected completion
4. THE Order_Tracking_System SHALL provide a `check_sla_breach_risk(order_id, service_type)` function that returns a boolean indicating if the order is at risk of missing the SLA target
5. THE Order_Tracking_System SHALL provide a `record_status_change(service_type, order_id, old_status, new_status, changed_by)` function that implements the SCD Type 2 pattern
6. THE Order_Tracking_System SHALL provide a `get_cycle_time_target(service_type, order_type)` function that returns the target business days for a given service type and order type combination
7. THE Order_Tracking_System SHALL provide a `refresh_sla_metrics()` function that recalculates the SLA metrics materialized view

### Requirement 8: Data Quality Constraints and Validation

**User Story:** As a Data Engineer, I want database-level constraints and validation functions that enforce data quality rules, so that invalid data is rejected at write time and data completeness is maintained above 99.5%.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL enforce CHECK constraints ensuring requested_due_date, committed_due_date, and actual_completion_date are after created_at when present
2. THE Order_Tracking_System SHALL enforce CHECK constraints ensuring sites_completed is less than or equal to total_sites on the project_orders table
3. THE Order_Tracking_System SHALL enforce CHECK constraints ensuring bandwidth_mbps is greater than zero on the ethernet_orders table
4. THE Order_Tracking_System SHALL enforce that vlan_id is between 1 and 4094 on the ethernet_orders table
5. THE Order_Tracking_System SHALL provide a validation function that checks all required fields are present before accepting an order record
6. THE Order_Tracking_System SHALL provide a `data_quality_log` table that records validation failures with order_id, field_name, violation_type, and detected_at
7. THE Order_Tracking_System SHALL provide a `source_system_freshness` table that tracks last_sync_timestamp per source system and raises alerts when freshness exceeds the pipeline SLA threshold

### Requirement 9: Performance Indexes and Query Optimization

**User Story:** As a Data Analyst, I want query performance at p95 ≤ 3 seconds for dashboard queries, so that the system is responsive for real-time operational monitoring.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL create indexes on order_status (or project_status) for all order tables to support status-based filtering
2. THE Order_Tracking_System SHALL create indexes on customer_id for all order tables to support customer-scoped queries
3. THE Order_Tracking_System SHALL create indexes on created_at for all order tables to support time-range queries
4. THE Order_Tracking_System SHALL create a composite index on (service_type, order_id) on the order_status_history table to support history lookups
5. THE Order_Tracking_System SHALL create an index on is_current on the order_status_history table to support queries for current status records
6. THE Order_Tracking_System SHALL create composite indexes on (service_type, canonical_status, created_at) on the unified orders view or underlying tables to support dashboard aggregate queries
7. THE Order_Tracking_System SHALL create indexes on committed_due_date for all order tables to support SLA breach detection queries

### Requirement 10: Project Management Order Linkage

**User Story:** As a Project Manager, I want project orders linked to their child service orders, so that I can view the rollup status and progress of multi-service projects.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL provide a `project_order_links` junction table with columns: id, project_id, service_type, order_id, linked_at
2. THE Order_Tracking_System SHALL enforce referential integrity between project_order_links.project_id and project_orders.project_id
3. THE Order_Tracking_System SHALL provide a view that shows each project with the count and status breakdown of its child service orders
4. WHEN a child order's status changes, THEN THE Order_Tracking_System SHALL make the updated status visible in the project rollup view without manual intervention
5. THE Order_Tracking_System SHALL enforce uniqueness on (project_id, service_type, order_id) in the project_order_links table to prevent duplicate linkages

### Requirement 11: Alerting Infrastructure

**User Story:** As an Operations Manager, I want the database to generate and store alert records when orders breach SLA thresholds or become stuck, so that the alerting platform can consume and dispatch notifications.

#### Acceptance Criteria

1. THE Order_Tracking_System SHALL provide an `alerts` table with columns: id, alert_type, service_type, order_id, severity, message, created_at, acknowledged_at, acknowledged_by
2. THE Order_Tracking_System SHALL define an `alert_type` enum with values: sla_breach_risk, stuck_order, data_freshness_degradation, pipeline_failure
3. THE Order_Tracking_System SHALL define a `severity_level` enum with values: critical, high, medium, low
4. WHEN the Alert_Trigger_Function detects an SLA breach risk, THEN THE Order_Tracking_System SHALL insert an alert record with alert_type 'sla_breach_risk' and appropriate severity
5. WHEN the Alert_Trigger_Function detects a stuck order, THEN THE Order_Tracking_System SHALL insert an alert record with alert_type 'stuck_order'
6. WHEN source system freshness exceeds the pipeline SLA threshold, THEN THE Order_Tracking_System SHALL insert an alert record with alert_type 'data_freshness_degradation'
