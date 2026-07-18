-- Migration: Create all 5 service order tables in order_tracking schema
-- Depends on: 20260717100000_create_schema_and_enums.sql (schema + enum types)

-- Ethernet Orders
CREATE TABLE order_tracking.ethernet_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT NOT NULL UNIQUE,
  order_type    order_tracking.order_type NOT NULL,
  service_subtype order_tracking.ethernet_service_subtype,
  bandwidth_mbps INTEGER CHECK (bandwidth_mbps > 0),
  port_speed    order_tracking.port_speed,
  vlan_id       INTEGER CHECK (vlan_id BETWEEN 1 AND 4094),
  a_location_clli TEXT,
  z_location_clli TEXT,
  cos_profile   order_tracking.cos_profile,
  customer_id   TEXT NOT NULL,
  order_status  order_tracking.ethernet_order_status NOT NULL,
  requested_due_date  TIMESTAMPTZ,
  committed_due_date  TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ethernet_dates_after_created
    CHECK (requested_due_date IS NULL OR requested_due_date >= created_at),
  CONSTRAINT chk_ethernet_committed_after_created
    CHECK (committed_due_date IS NULL OR committed_due_date >= created_at),
  CONSTRAINT chk_ethernet_completion_after_created
    CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at)
);

-- OCN Orders
CREATE TABLE order_tracking.ocn_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT NOT NULL UNIQUE,
  order_type    order_tracking.order_type NOT NULL,
  ocn_rate      order_tracking.ocn_rate,
  circuit_id    TEXT,
  ring_id       TEXT,
  protection_type order_tracking.protection_type,
  a_location_clli TEXT,
  z_location_clli TEXT,
  customer_id   TEXT NOT NULL,
  order_status  order_tracking.ocn_order_status NOT NULL,
  requested_due_date  TIMESTAMPTZ,
  committed_due_date  TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ocn_dates_after_created
    CHECK (requested_due_date IS NULL OR requested_due_date >= created_at),
  CONSTRAINT chk_ocn_committed_after_created
    CHECK (committed_due_date IS NULL OR committed_due_date >= created_at),
  CONSTRAINT chk_ocn_completion_after_created
    CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at)
);

-- DS1 Orders
CREATE TABLE order_tracking.ds1_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT NOT NULL UNIQUE,
  order_type    order_tracking.order_type NOT NULL,
  circuit_id    TEXT,
  framing_type  order_tracking.ds1_framing_type,
  line_coding   order_tracking.line_coding,
  channelization order_tracking.ds1_channelization,
  a_location_clli TEXT,
  z_location_clli TEXT,
  customer_id   TEXT NOT NULL,
  order_status  order_tracking.ds1_ds3_order_status NOT NULL,
  requested_due_date  TIMESTAMPTZ,
  committed_due_date  TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ds1_dates_after_created
    CHECK (requested_due_date IS NULL OR requested_due_date >= created_at),
  CONSTRAINT chk_ds1_committed_after_created
    CHECK (committed_due_date IS NULL OR committed_due_date >= created_at),
  CONSTRAINT chk_ds1_completion_after_created
    CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at)
);

-- DS3 Orders
CREATE TABLE order_tracking.ds3_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      TEXT NOT NULL UNIQUE,
  order_type    order_tracking.order_type NOT NULL,
  circuit_id    TEXT,
  framing_type  order_tracking.ds3_framing_type,
  channel_config order_tracking.ds3_channel_config,
  a_location_clli TEXT,
  z_location_clli TEXT,
  customer_id   TEXT NOT NULL,
  order_status  order_tracking.ds1_ds3_order_status NOT NULL,
  requested_due_date  TIMESTAMPTZ,
  committed_due_date  TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ds3_dates_after_created
    CHECK (requested_due_date IS NULL OR requested_due_date >= created_at),
  CONSTRAINT chk_ds3_committed_after_created
    CHECK (committed_due_date IS NULL OR committed_due_date >= created_at),
  CONSTRAINT chk_ds3_completion_after_created
    CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at)
);

-- Project Orders
CREATE TABLE order_tracking.project_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL UNIQUE,
  project_name  TEXT,
  project_type  order_tracking.project_type,
  project_manager_id TEXT,
  customer_id   TEXT NOT NULL,
  total_sites   INTEGER DEFAULT 0,
  sites_completed INTEGER DEFAULT 0,
  project_status order_tracking.project_status NOT NULL,
  priority      order_tracking.priority_level,
  requested_due_date  TIMESTAMPTZ,
  committed_due_date  TIMESTAMPTZ,
  actual_completion_date TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_project_sites
    CHECK (sites_completed <= total_sites),
  CONSTRAINT chk_project_dates_after_created
    CHECK (requested_due_date IS NULL OR requested_due_date >= created_at),
  CONSTRAINT chk_project_committed_after_created
    CHECK (committed_due_date IS NULL OR committed_due_date >= created_at),
  CONSTRAINT chk_project_completion_after_created
    CHECK (actual_completion_date IS NULL OR actual_completion_date >= created_at)
);
