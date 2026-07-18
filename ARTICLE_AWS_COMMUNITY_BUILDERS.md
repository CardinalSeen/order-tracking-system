# Unifying Telecom Order Tracking: Building a Data Platform Across 5 Legacy Systems

**Author:** Marc Sandrino  
**Category:** Data Engineering  
**Published:** July 2026

---

## Introduction

In telecom operations, order tracking is one of those problems that looks simple on paper but hides enormous complexity underneath. A customer orders an Ethernet circuit — how hard can it be to track that?

The reality: most telecom providers operate 4-8 separate provisioning systems, each with its own schema, status workflow, and data model. Ethernet lives in one OSS, optical circuits in another, legacy TDM services (DS1/DS3) in a third, and project management coordination in yet another tool. The result is fragmented visibility, manual reconciliation, and SLA breaches that go undetected until a customer escalates.

This article walks through how I designed and built a unified Order Tracking System that consolidates orders from 5 disparate service types into a single queryable platform with real-time SLA monitoring, status normalization, and operational analytics.

---

## How Kiro Accelerated the Build

This project was built using **Kiro**, an AI-powered IDE that takes a spec-driven development approach. Rather than jumping straight into code, Kiro structures work through a PRD → Requirements → Design → Tasks workflow:

1. **PRD as the source of truth** — I authored a detailed Product Requirements Document covering all 5 service types, data models, SLA targets, and architecture decisions. Kiro used this as the foundation for everything that followed.

2. **Structured spec generation** — From the PRD, Kiro helped break down the work into a formal spec with requirements, design decisions, and implementation tasks. This meant the database schema, normalization functions, and dashboard pages were all traceable back to specific PRD requirements.

3. **Task-driven implementation** — Each migration file, database function, view, and frontend page was implemented as a discrete task with clear acceptance criteria. Kiro handled the full implementation loop: schema creation → data seeding → API wiring → UI rendering → build verification.

4. **Iterative refinement** — The spec-driven approach made it easy to add features incrementally. When I needed the data quality dashboard (PRD requirement FR-DQ-05), it was a matter of adding a task rather than refactoring the whole app.

The result: a complete data platform prototype — 16 SQL migrations, 8 dashboard pages, full type safety, and live Supabase integration — built in a single session with the PRD as the guiding document. The spec workflow ensured nothing from the PRD was missed and every design decision was deliberate.

For data engineers who spend more time thinking about schemas and pipelines than writing React components, this approach lets you focus on the data architecture decisions while Kiro handles the implementation scaffolding.

---

## The Problem Space

Imagine you're an operations manager responsible for telecom service delivery. Your team handles:

- **Ethernet** (E-Line, E-LAN, E-Tree) — managed in a modern OSS with CDC capability
- **OCN** (OC-3 through OC-192) — separate provisioning system, also CDC-capable
- **DS1** (T1 lines) — legacy TDM system, batch extracts only
- **DS3** (T3 lines) — same legacy system as DS1
- **Project Management** — multi-service coordination tool with REST API

Each system has its own status terminology:

| What it means | Ethernet calls it | OCN calls it | DS1/DS3 calls it | PM calls it |
|---------------|-------------------|--------------|------------------|-------------|
| Order received | Submitted | Submitted | Submitted | Initiated |
| Being designed | In Design | Engineering | Facility Assignment | Planning |
| Being built | Provisioning | Provisioning | Provisioning | In Progress |
| Being tested | Testing | Turn-Up/Testing | Testing | UAT |
| Done | Complete | Complete | Complete | Complete |

Without a unified view, answering "how many orders are stuck in design phase?" requires querying 4 separate databases and manually mapping status names. SLA tracking is impossible to standardize.

---

## Architecture Overview

The system follows a medallion-style architecture adapted for operational data:

```
┌─────────────────────────────────────────────────────────┐
│                    SOURCE SYSTEMS                         │
│  Ethernet OSS │ OCN OSS │ DS1/DS3 Legacy │ PM Tool      │
└───────┬───────┴────┬────┴───────┬────────┴──────┬───────┘
        │ CDC/Kafka  │ CDC/Kafka  │ Batch/SFTP    │ REST API
        ▼            ▼            ▼               ▼
┌─────────────────────────────────────────────────────────┐
│              RAW / STAGING LAYER                          │
│         Service-specific tables with full attributes     │
└───────────────────────────┬─────────────────────────────┘
                            │ normalize_status()
                            │ SCD Type 2 history
                            ▼
┌─────────────────────────────────────────────────────────┐
│              CURATED / ANALYTICS LAYER                    │
│  unified_orders_view │ sla_metrics │ project_rollup     │
│  order_status_history │ alerts │ data_quality_scores    │
└───────────────────────────┬─────────────────────────────┘
                            │ PostgREST API
                            ▼
┌─────────────────────────────────────────────────────────┐
│              SERVING LAYER (Dashboard)                    │
│  KPIs │ Charts │ Unified Search │ SLA Monitoring        │
└─────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Service-Specific Tables + Unified View (Not One Big Table)

The temptation is to jam everything into a single `orders` table with nullable columns. I avoided this because:

- Each service has unique attributes that matter for operations (VLAN IDs for Ethernet, ring IDs for OCN, framing types for DS1)
- Enum constraints enforce data integrity at the database level
- Source-aligned tables make ingestion pipelines simpler (no transformation at write time)

Instead, I created 5 service-specific tables with proper types:

```sql
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
  -- date fields, timestamps...
);
```

Then a `UNION ALL` view provides the unified cross-service query layer:

```sql
CREATE VIEW order_tracking.unified_orders_view AS
SELECT id, order_id, 'ethernet' AS service_type,
       order_tracking.normalize_status('ethernet', order_status::TEXT) AS canonical_status,
       -- common fields...
FROM order_tracking.ethernet_orders
UNION ALL
SELECT id, order_id, 'ocn' AS service_type,
       order_tracking.normalize_status('ocn', order_status::TEXT) AS canonical_status,
       -- ...
FROM order_tracking.ocn_orders
-- UNION ALL for ds1, ds3, project_management
```

### 2. Status Normalization via Database Function

Rather than handling status mapping in application code (fragile, hard to maintain), I pushed it into a PostgreSQL function:

```sql
CREATE FUNCTION order_tracking.normalize_status(
  p_service_type TEXT, p_raw_status TEXT
) RETURNS order_tracking.canonical_order_status AS $$
BEGIN
  RETURN CASE
    WHEN p_raw_status IN ('Submitted', 'Initiated') THEN 'RECEIVED'
    WHEN p_raw_status IN ('In Design', 'Engineering', 'Facility Assignment', 'Planning') THEN 'DESIGN'
    WHEN p_raw_status IN ('Provisioning', 'In Progress') THEN 'IN_PROGRESS'
    WHEN p_raw_status IN ('Testing', 'Turn-Up', 'UAT') THEN 'TESTING'
    WHEN p_raw_status = 'Complete' THEN 'COMPLETE'
    WHEN p_raw_status = 'On Hold' THEN 'ON_HOLD'
    WHEN p_raw_status = 'Cancelled' THEN 'CANCELLED'
    ELSE 'RECEIVED'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

This means the unified view always reflects the correct canonical status without any ETL jobs running. Add a new source system? Add a mapping row — done.

### 3. SCD Type 2 for Status History

Every status change is captured with `effective_from` and `effective_to` timestamps, enabling:

- Time-in-status calculations (how long was this order stuck in Design?)
- Bottleneck analysis (which status stage takes the longest on average?)
- Audit trail (who changed what, when?)

```sql
CREATE TABLE order_tracking.order_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type    order_tracking.service_type NOT NULL,
  order_id        TEXT NOT NULL,
  previous_status TEXT,
  new_status      TEXT NOT NULL,
  canonical_status order_tracking.canonical_order_status,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by      TEXT,
  effective_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to    TIMESTAMPTZ,
  is_current      BOOLEAN DEFAULT true
);
```

A trigger on each service table automatically records history entries when `order_status` changes.

### 4. Materialized View for SLA Metrics

SLA calculations are expensive (business day calculations, cycle time, variance against committed dates). Rather than computing these on every dashboard load, I use a materialized view:

```sql
CREATE MATERIALIZED VIEW order_tracking.sla_metrics AS
SELECT
  order_id, service_type, canonical_status, created_at,
  committed_due_date, actual_completion_date,
  -- days in current status
  EXTRACT(DAYS FROM now() - last_status_change) AS days_in_current_status,
  -- total cycle time (for completed orders)
  order_tracking.count_business_days(created_at, actual_completion_date) AS cycle_time,
  -- SLA variance
  order_tracking.calculate_sla_variance(...) AS sla_variance_days,
  -- breach risk flag
  order_tracking.check_sla_breach_risk(...) AS breach_risk
FROM order_tracking.unified_orders_view;
```

Refreshed periodically (or on-demand after batch ingestion), this gives sub-second query performance for the dashboard while keeping the computation logic centralized.

### 5. Service-Specific Cycle Time Targets

The PRD defines different SLA targets per service type:

| Service | New Order Target | Change Order Target |
|---------|-----------------|-------------------|
| Ethernet | ≤ 30 business days | ≤ 15 business days |
| OCN | ≤ 45 business days | ≤ 20 business days |
| DS1 | ≤ 10 business days | ≤ 5 business days |
| DS3 | ≤ 15 business days | ≤ 7 business days |

These are stored in a `cycle_time_targets` table and referenced by the SLA breach risk function — making them configurable without code changes.

---

## The Serving Layer

The dashboard is built with Next.js 16 (App Router) consuming Supabase's PostgREST API. Key pages:

**Dashboard** — KPI cards (total orders, active, at-risk, on-time rate, avg cycle time), order volume trend chart, status/service distribution

**Unified Order Search** — Filters by service type, status, order type with sortable columns, pagination, and CSV export. Each order links to a detail view showing the full workflow progress, service-specific attributes, and status timeline.

**SLA Metrics** — Cycle time actual vs target comparison, order aging distribution (how many orders are stuck 0-5 days, 6-10 days, 11-20 days, 30+ days), at-risk orders table

**Analytics** — Bottleneck analysis (average time per status stage), completion trends, fallout rates, stacked area charts by service type

**Data Quality** — Completeness, validity, and freshness scores per source system with pipeline health indicators

---

## Lessons Learned

**1. Normalize at the database level, not the application level.**
Putting status mapping in a PostgreSQL function means every consumer (dashboard, API, reports, ad-hoc SQL) gets consistent results without duplicating logic.

**2. Keep source-aligned tables.**
The urge to create one unified table is strong but leads to sparse columns, lost type safety, and complex ingestion logic. UNION ALL views give you the best of both worlds.

**3. Business day calculations are harder than you think.**
Weekends are obvious, but holidays vary by region. I implemented a `count_business_days()` function that can be extended with a holiday calendar table.

**4. Materialized views are underrated for operational dashboards.**
They give you the query performance of a denormalized table with the correctness of computed logic. The tradeoff (staleness) is acceptable when your source data has 5-15 minute latency anyway.

**5. Start with the status taxonomy.**
The canonical status mapping was the single most important design decision. Getting stakeholders to agree on 7 canonical statuses across 5 service types unblocked everything else.

---

## What's Next

The production vision (documented in the full PRD) includes:

- **CDC pipelines** with Debezium/Kafka for real-time Ethernet and OCN ingestion
- **Batch orchestration** for DS1/DS3 legacy systems (15-minute polling)
- **Automated alerting** via webhooks when orders breach SLA thresholds
- **Data lineage** with column-level tracking from source to serving layer
- **RBAC** with role-based views (Operations Manager sees dashboards, Data Analyst gets SQL access, External Auditor gets PII-masked historical data)

---

## Try It Yourself

The full source code is available on GitHub with synthetic data for exploration:

🔗 **GitHub:** https://github.com/CardinalSeen/order-tracking-system

The repo includes:
- Complete PostgreSQL migration files (schema, functions, triggers, views)
- Next.js dashboard with Tailwind CSS and Recharts
- Supabase integration with public-schema proxy views
- Full PRD document with architecture diagrams
- Kiro spec files (requirements, design, tasks) showing the structured development workflow

**Built with:** Kiro (AI-powered IDE with spec-driven development) · Supabase · Next.js 16 · PostgreSQL · TypeScript · Tailwind CSS · Recharts

---

## Conclusion

Unified order tracking isn't a frontend problem — it's a data modeling problem. The dashboard is just the visible tip; the real value is in the canonical status taxonomy, the SCD2 history model, the SLA computation logic, and the schema design that preserves service-specific attributes while enabling cross-service queries.

For anyone building similar platforms in telecom, utilities, or any multi-system operations environment: start with the status normalization, invest in proper database-level constraints, and don't be afraid of UNION ALL views.

---

*Marc Sandrino is a data engineering professional focused on building operational data platforms for telecom services. AWS Community Builder candidate (Data category).*
