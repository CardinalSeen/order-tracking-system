export type ServiceType = "ethernet" | "ocn" | "ds1" | "ds3" | "project_management";

export type CanonicalStatus =
  | "RECEIVED"
  | "DESIGN"
  | "IN_PROGRESS"
  | "TESTING"
  | "COMPLETE"
  | "ON_HOLD"
  | "CANCELLED";

export type OrderType = "New" | "Change" | "Disconnect" | "Upgrade";

export interface UnifiedOrder {
  id: string;
  order_id: string;
  service_type: ServiceType;
  order_type: OrderType | null;
  customer_id: string;
  raw_status: string;
  canonical_status: CanonicalStatus;
  a_location_clli: string | null;
  z_location_clli: string | null;
  requested_due_date: string | null;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface EthernetOrder {
  id: string;
  order_id: string;
  order_type: OrderType;
  service_subtype: string;
  bandwidth_mbps: number | null;
  port_speed: string | null;
  vlan_id: number | null;
  a_location_clli: string;
  z_location_clli: string;
  cos_profile: string | null;
  customer_id: string;
  order_status: string;
  requested_due_date: string | null;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OcnOrder {
  id: string;
  order_id: string;
  order_type: OrderType;
  ocn_rate: string;
  circuit_id: string | null;
  ring_id: string | null;
  protection_type: string | null;
  a_location_clli: string;
  z_location_clli: string;
  customer_id: string;
  order_status: string;
  requested_due_date: string | null;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ds1Order {
  id: string;
  order_id: string;
  order_type: OrderType;
  circuit_id: string | null;
  framing_type: string | null;
  line_coding: string | null;
  channelization: string | null;
  a_location_clli: string;
  z_location_clli: string;
  customer_id: string;
  order_status: string;
  requested_due_date: string | null;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ds3Order {
  id: string;
  order_id: string;
  order_type: OrderType;
  circuit_id: string | null;
  framing_type: string | null;
  channel_config: string | null;
  a_location_clli: string;
  z_location_clli: string;
  customer_id: string;
  order_status: string;
  requested_due_date: string | null;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectOrder {
  id: string;
  project_id: string;
  project_name: string | null;
  project_type: string | null;
  project_manager_id: string | null;
  customer_id: string;
  total_sites: number;
  sites_completed: number;
  project_status: string;
  priority: string | null;
  requested_due_date: string | null;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlaMetric {
  order_id: string;
  service_type: ServiceType;
  canonical_status: CanonicalStatus;
  created_at: string;
  committed_due_date: string | null;
  actual_completion_date: string | null;
  days_in_current_status: number | null;
  cycle_time: number | null;
  sla_variance_days: number | null;
  breach_risk: boolean;
}

export interface ProjectRollup {
  project_id: string;
  project_name: string | null;
  project_type: string | null;
  project_manager_id: string | null;
  customer_id: string;
  project_status: string;
  total_sites: number;
  sites_completed: number;
  priority: string | null;
  requested_due_date: string | null;
  committed_due_date: string | null;
  linked_orders_count: number;
  completed_orders: number;
  in_progress_orders: number;
  cancelled_orders: number;
}

export interface Alert {
  id: string;
  alert_type: string;
  service_type: ServiceType | null;
  order_id: string | null;
  severity: string;
  message: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

export interface StatusHistoryRecord {
  id: string;
  service_type: ServiceType;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  canonical_status: CanonicalStatus | null;
  changed_at: string;
  changed_by: string | null;
  effective_from: string;
  effective_to: string | null;
  is_current: boolean;
}

export interface DataQualityScore {
  id: string;
  service_type: ServiceType;
  check_date: string;
  total_records: number;
  valid_records: number;
  completeness_score: number;
  accuracy_score: number;
  freshness_score: number;
  overall_score: number;
}

export interface CycleTimeTarget {
  service_type: ServiceType;
  order_type: string;
  target_days: number;
}

export const CYCLE_TIME_TARGETS: CycleTimeTarget[] = [
  { service_type: "ethernet", order_type: "New", target_days: 30 },
  { service_type: "ethernet", order_type: "Change", target_days: 15 },
  { service_type: "ocn", order_type: "New", target_days: 45 },
  { service_type: "ocn", order_type: "Change", target_days: 20 },
  { service_type: "ds1", order_type: "New", target_days: 10 },
  { service_type: "ds1", order_type: "Change", target_days: 5 },
  { service_type: "ds3", order_type: "New", target_days: 15 },
  { service_type: "ds3", order_type: "Change", target_days: 7 },
];

export const SERVICE_LABELS: Record<ServiceType, string> = {
  ethernet: "Ethernet",
  ocn: "OCN",
  ds1: "DS1",
  ds3: "DS3",
  project_management: "Project Management",
};

export const STATUS_WORKFLOW: Record<ServiceType, string[]> = {
  ethernet: ["Submitted", "In Design", "Provisioning", "Testing", "Complete", "Cancelled"],
  ocn: ["Submitted", "Engineering", "Provisioning", "Turn-Up", "Testing", "Complete", "Cancelled"],
  ds1: ["Submitted", "Facility Assignment", "Provisioning", "Testing", "Complete", "Cancelled"],
  ds3: ["Submitted", "Facility Assignment", "Provisioning", "Testing", "Complete", "Cancelled"],
  project_management: ["Initiated", "Planning", "In Progress", "UAT", "Complete", "On Hold", "Cancelled"],
};
