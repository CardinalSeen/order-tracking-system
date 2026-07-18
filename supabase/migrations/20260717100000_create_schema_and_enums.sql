-- Migration: Create order_tracking schema and all enum types
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10

-- Schema creation
CREATE SCHEMA IF NOT EXISTS order_tracking;

-- Service type enum
CREATE TYPE order_tracking.service_type AS ENUM (
  'ethernet', 'ocn', 'ds1', 'ds3', 'project_management'
);

-- Canonical status (unified taxonomy)
CREATE TYPE order_tracking.canonical_order_status AS ENUM (
  'RECEIVED', 'DESIGN', 'IN_PROGRESS', 'TESTING',
  'COMPLETE', 'ON_HOLD', 'CANCELLED'
);

-- Service-specific status enums
CREATE TYPE order_tracking.ethernet_order_status AS ENUM (
  'Submitted', 'In Design', 'Provisioning', 'Testing', 'Complete', 'Cancelled'
);

CREATE TYPE order_tracking.ocn_order_status AS ENUM (
  'Submitted', 'Engineering', 'Provisioning', 'Turn-Up', 'Testing', 'Complete', 'Cancelled'
);

CREATE TYPE order_tracking.ds1_ds3_order_status AS ENUM (
  'Submitted', 'Facility Assignment', 'Provisioning', 'Testing', 'Complete', 'Cancelled'
);

CREATE TYPE order_tracking.project_status AS ENUM (
  'Initiated', 'Planning', 'In Progress', 'UAT', 'Complete', 'On Hold', 'Cancelled'
);

-- Order type enum
CREATE TYPE order_tracking.order_type AS ENUM (
  'New', 'Change', 'Disconnect', 'Upgrade'
);

-- Ethernet-specific enums
CREATE TYPE order_tracking.ethernet_service_subtype AS ENUM (
  'E-Line', 'E-LAN', 'E-Tree', 'Metro Ethernet'
);

CREATE TYPE order_tracking.port_speed AS ENUM (
  '10M', '100M', '1G', '10G', '100G'
);

CREATE TYPE order_tracking.cos_profile AS ENUM (
  'Real-Time', 'Business Critical', 'Standard'
);

-- OCN-specific enums
CREATE TYPE order_tracking.ocn_rate AS ENUM (
  'OC-3', 'OC-12', 'OC-48', 'OC-192'
);

CREATE TYPE order_tracking.protection_type AS ENUM (
  'UPSR', 'BLSR', '1+1', 'Unprotected'
);

-- DS1-specific enums
CREATE TYPE order_tracking.ds1_framing_type AS ENUM ('ESF', 'D4');
CREATE TYPE order_tracking.line_coding AS ENUM ('AMI', 'B8ZS');
CREATE TYPE order_tracking.ds1_channelization AS ENUM ('Channelized', 'Unchannelized');

-- DS3-specific enums
CREATE TYPE order_tracking.ds3_framing_type AS ENUM ('C-Bit', 'M13');
CREATE TYPE order_tracking.ds3_channel_config AS ENUM ('Clear Channel', 'Channelized');

-- Project Management enums
CREATE TYPE order_tracking.project_type AS ENUM (
  'Multi-Site', 'Complex Build', 'Migration', 'Custom'
);

CREATE TYPE order_tracking.priority_level AS ENUM (
  'Critical', 'High', 'Medium', 'Low'
);

-- Alert enums
CREATE TYPE order_tracking.alert_type AS ENUM (
  'sla_breach_risk', 'stuck_order', 'data_freshness_degradation', 'pipeline_failure'
);

CREATE TYPE order_tracking.severity_level AS ENUM (
  'critical', 'high', 'medium', 'low'
);
