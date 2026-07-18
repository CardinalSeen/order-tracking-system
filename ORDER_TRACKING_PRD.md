# Product Requirements Document (PRD)
# Order Tracking System — Ethernet, OCN, DS1, DS3 & Project Management Services

**Version:** 1.0  
**Date:** July 17, 2026  
**Author:** Data Engineering Team  
**Status:** Draft  

---

## 1. Executive Summary

This document defines the product requirements for an Order Tracking system that provides end-to-end visibility into the lifecycle of telecom service orders across five service types: Ethernet, Optical Carrier Network (OCN), DS1, DS3, and Project Management Services. The system will unify order data from disparate upstream provisioning systems into a single data platform, enabling real-time tracking, reporting, SLA monitoring, and operational analytics.

---

## 2. Problem Statement

Current order tracking is fragmented across multiple legacy systems with inconsistent data models, limited cross-service visibility, and no unified reporting layer. This results in:

- Inability to track orders across service types in a single view
- Manual reconciliation between provisioning systems and billing
- Delayed identification of stuck or at-risk orders
- Lack of historical trend analysis for capacity planning
- No standardized SLA measurement across service types

---

## 3. Goals & Objectives

| # | Objective | Success Metric |
|---|-----------|----------------|
| 1 | Unified order visibility across all 5 service types | 100% of orders queryable from a single platform |
| 2 | Real-time or near-real-time order status updates | Latency ≤ 5 minutes from source system update |
| 3 | SLA tracking and alerting | Automated alerts for orders at risk of SLA breach |
| 4 | Historical analytics and trend reporting | Dashboards with 24-month lookback |
| 5 | Data quality and lineage | ≥ 99.5% data completeness; full lineage traceability |

---

## 4. Scope

### 4.1 In Scope

- **Ethernet Services:** Metro Ethernet, Carrier Ethernet, E-Line, E-LAN, E-Tree orders
- **OCN (Optical Carrier Network):** OC-3, OC-12, OC-48, OC-192 circuit provisioning orders
- **DS1 Services:** T1 line orders (1.544 Mbps), channelized and unchannelized
- **DS3 Services:** T3 line orders (44.736 Mbps), clear channel and channelized
- **Project Management Services:** Complex/multi-service project orders requiring coordination across multiple service types

### 4.2 Out of Scope

- Billing system integration (Phase 2)
- Customer self-service portal (separate initiative)
- Network inventory management
- Wireless/mobile service orders

---

## 5. Service-Specific Order Data Models

### 5.1 Ethernet Order Entity

| Field | Type | Description |
|-------|------|-------------|
| order_id | STRING | Unique order identifier |
| order_type | ENUM | New, Change, Disconnect, Upgrade |
| service_subtype | ENUM | E-Line, E-LAN, E-Tree, Metro Ethernet |
| bandwidth_mbps | INTEGER | Provisioned bandwidth in Mbps |
| port_speed | ENUM | 10M, 100M, 1G, 10G, 100G |
| vlan_id | INTEGER | VLAN assignment |
| a_location_clli | STRING | A-end location CLLI code |
| z_location_clli | STRING | Z-end location CLLI code |
| cos_profile | ENUM | Class of Service (Real-Time, Business Critical, Standard) |
| customer_id | STRING | Customer account identifier |
| order_status | ENUM | Submitted, In Design, Provisioning, Testing, Complete, Cancelled |
| requested_due_date | TIMESTAMP | Customer-requested completion date |
| committed_due_date | TIMESTAMP | Committed delivery date |
| actual_completion_date | TIMESTAMP | Actual completion timestamp |
| created_at | TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | Last modification timestamp |

### 5.2 OCN Order Entity

| Field | Type | Description |
|-------|------|-------------|
| order_id | STRING | Unique order identifier |
| order_type | ENUM | New, Change, Disconnect, Upgrade |
| ocn_rate | ENUM | OC-3, OC-12, OC-48, OC-192 |
| circuit_id | STRING | Circuit identifier |
| ring_id | STRING | SONET ring identifier |
| protection_type | ENUM | UPSR, BLSR, 1+1, Unprotected |
| a_location_clli | STRING | A-end location CLLI code |
| z_location_clli | STRING | Z-end location CLLI code |
| customer_id | STRING | Customer account identifier |
| order_status | ENUM | Submitted, Engineering, Provisioning, Turn-Up, Testing, Complete, Cancelled |
| requested_due_date | TIMESTAMP | Customer-requested completion date |
| committed_due_date | TIMESTAMP | Committed delivery date |
| actual_completion_date | TIMESTAMP | Actual completion timestamp |
| created_at | TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | Last modification timestamp |

### 5.3 DS1 Order Entity

| Field | Type | Description |
|-------|------|-------------|
| order_id | STRING | Unique order identifier |
| order_type | ENUM | New, Change, Disconnect |
| circuit_id | STRING | Circuit identifier |
| framing_type | ENUM | ESF, D4 |
| line_coding | ENUM | AMI, B8ZS |
| channelization | ENUM | Channelized (24xDS0), Unchannelized |
| a_location_clli | STRING | A-end location CLLI code |
| z_location_clli | STRING | Z-end location CLLI code |
| customer_id | STRING | Customer account identifier |
| order_status | ENUM | Submitted, Facility Assignment, Provisioning, Testing, Complete, Cancelled |
| requested_due_date | TIMESTAMP | Customer-requested completion date |
| committed_due_date | TIMESTAMP | Committed delivery date |
| actual_completion_date | TIMESTAMP | Actual completion timestamp |
| created_at | TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | Last modification timestamp |

### 5.4 DS3 Order Entity

| Field | Type | Description |
|-------|------|-------------|
| order_id | STRING | Unique order identifier |
| order_type | ENUM | New, Change, Disconnect |
| circuit_id | STRING | Circuit identifier |
| framing_type | ENUM | C-Bit, M13 |
| channel_config | ENUM | Clear Channel, Channelized (28xDS1) |
| a_location_clli | STRING | A-end location CLLI code |
| z_location_clli | STRING | Z-end location CLLI code |
| customer_id | STRING | Customer account identifier |
| order_status | ENUM | Submitted, Facility Assignment, Provisioning, Testing, Complete, Cancelled |
| requested_due_date | TIMESTAMP | Customer-requested completion date |
| committed_due_date | TIMESTAMP | Committed delivery date |
| actual_completion_date | TIMESTAMP | Actual completion timestamp |
| created_at | TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | Last modification timestamp |

### 5.5 Project Management Services Order Entity

| Field | Type | Description |
|-------|------|-------------|
| project_id | STRING | Unique project identifier |
| project_name | STRING | Descriptive project name |
| project_type | ENUM | Multi-Site, Complex Build, Migration, Custom |
| associated_order_ids | ARRAY[STRING] | List of child service order IDs |
| service_types_involved | ARRAY[ENUM] | Ethernet, OCN, DS1, DS3 combinations |
| project_manager_id | STRING | Assigned PM identifier |
| customer_id | STRING | Customer account identifier |
| total_sites | INTEGER | Number of sites in scope |
| sites_completed | INTEGER | Number of completed sites |
| project_status | ENUM | Initiated, Planning, In Progress, UAT, Complete, On Hold, Cancelled |
| priority | ENUM | Critical, High, Medium, Low |
| requested_due_date | TIMESTAMP | Customer-requested completion date |
| committed_due_date | TIMESTAMP | Committed delivery date |
| actual_completion_date | TIMESTAMP | Actual completion timestamp |
| created_at | TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | Last modification timestamp |

---

## 6. Data Architecture

### 6.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SOURCE SYSTEMS                                │
├──────────┬──────────┬──────────┬──────────┬─────────────────────────┤
│ Ethernet │   OCN    │   DS1    │   DS3    │  Project Mgmt           │
│  OSS     │   OSS    │   OSS    │   OSS    │  System                 │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴───────────┬────────────┘
     │          │          │          │                  │
     ▼          ▼          ▼          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │  CDC /     │  │   Batch    │  │   API      │                    │
│  │  Streaming │  │   Extract  │  │   Polling  │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RAW / STAGING LAYER                              │
│         (Landing zone — immutable, partitioned by source)           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  TRANSFORMATION LAYER (ELT/ETL)                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  Data Quality Checks │ Deduplication │ Schema Mapping    │       │
│  │  SCD Type 2 History  │ Status Normalization              │       │
│  └──────────────────────────────────────────────────────────┘       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CURATED / ANALYTICS LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Unified  │  │   SLA    │  │  Status  │  │  Project Mgmt    │   │
│  │ Order    │  │  Metrics │  │  History │  │  Aggregations    │   │
│  │  Fact    │  │  Table   │  │  Table   │  │  Table           │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVING / CONSUMPTION LAYER                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │ Dashboards │  │    API     │  │   Alerts   │  │  Exports /  │  │
│  │ (BI Tool)  │  │  Service   │  │   Engine   │  │  Reports    │  │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Data Pipeline Specifications

| Pipeline | Source | Method | Frequency | SLA |
|----------|--------|--------|-----------|-----|
| Ethernet Orders | Ethernet OSS | CDC (Debezium/Kafka) | Near real-time | ≤ 5 min |
| OCN Orders | OCN Provisioning System | CDC (Debezium/Kafka) | Near real-time | ≤ 5 min |
| DS1 Orders | Legacy TDM OSS | Batch Extract (SFTP/DB) | Every 15 min | ≤ 20 min |
| DS3 Orders | Legacy TDM OSS | Batch Extract (SFTP/DB) | Every 15 min | ≤ 20 min |
| Project Mgmt Orders | PM Tool (API) | REST API Polling | Every 5 min | ≤ 10 min |

### 6.3 Data Storage Strategy

| Layer | Technology | Retention | Partitioning |
|-------|-----------|-----------|--------------|
| Raw/Staging | Data Lake (Parquet/Delta) | 7 years | date, source_system |
| Curated/Analytics | Data Warehouse (Columnar) | 7 years | service_type, order_date |
| Serving (Hot) | Operational DB / Cache | 90 days | order_status |
| Archive | Cold Storage | 10 years | year |

---

## 7. Unified Order Status Taxonomy

Since each service type has its own status workflow, a normalized status model is required:

| Canonical Status | Ethernet | OCN | DS1/DS3 | Project Mgmt |
|-----------------|----------|-----|---------|--------------|
| RECEIVED | Submitted | Submitted | Submitted | Initiated |
| DESIGN | In Design | Engineering | Facility Assignment | Planning |
| IN_PROGRESS | Provisioning | Provisioning | Provisioning | In Progress |
| TESTING | Testing | Turn-Up/Testing | Testing | UAT |
| COMPLETE | Complete | Complete | Complete | Complete |
| ON_HOLD | — | — | — | On Hold |
| CANCELLED | Cancelled | Cancelled | Cancelled | Cancelled |

---

## 8. Functional Requirements

### 8.1 Data Ingestion

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DI-01 | Ingest order creation, update, and cancellation events from all 5 source systems | P0 |
| FR-DI-02 | Support Change Data Capture for Ethernet and OCN source systems | P0 |
| FR-DI-03 | Support batch file ingestion for DS1/DS3 legacy systems | P0 |
| FR-DI-04 | Support REST API polling for Project Management system | P0 |
| FR-DI-05 | Capture full order payload including all service-specific attributes | P0 |
| FR-DI-06 | Apply schema validation at ingestion with dead-letter queue for failures | P0 |
| FR-DI-07 | Maintain idempotent ingestion to handle replays without duplication | P1 |

### 8.2 Data Transformation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DT-01 | Normalize order status across all service types to canonical taxonomy | P0 |
| FR-DT-02 | Implement SCD Type 2 for order status history tracking | P0 |
| FR-DT-03 | Calculate derived metrics: days in status, days to completion, SLA variance | P0 |
| FR-DT-04 | Resolve customer identity across systems using customer_id matching | P1 |
| FR-DT-05 | Link child service orders to parent Project Management orders | P0 |
| FR-DT-06 | Deduplicate orders received from multiple source feeds | P1 |
| FR-DT-07 | Enrich location data with geographic coordinates from CLLI codes | P2 |

### 8.3 Data Quality

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DQ-01 | Validate required fields are present on every order record | P0 |
| FR-DQ-02 | Check referential integrity between orders and customer master | P1 |
| FR-DQ-03 | Detect and alert on anomalous order volumes (±2 std deviations) | P1 |
| FR-DQ-04 | Track data freshness per source system with automated alerting | P0 |
| FR-DQ-05 | Generate daily data quality scorecard per service type | P1 |
| FR-DQ-06 | Maintain data lineage metadata for all transformations | P1 |

### 8.4 Analytics & Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AR-01 | Provide unified order search across all service types | P0 |
| FR-AR-02 | Dashboard: Order volume by service type, status, and time period | P0 |
| FR-AR-03 | Dashboard: SLA compliance (on-time delivery %) by service type | P0 |
| FR-AR-04 | Dashboard: Average cycle time by service type and order type | P0 |
| FR-AR-05 | Dashboard: Orders at risk of SLA breach (aging analysis) | P0 |
| FR-AR-06 | Dashboard: Project Management roll-up with child order status | P1 |
| FR-AR-07 | Report: Monthly order completion trends with YoY comparison | P1 |
| FR-AR-08 | Report: Bottleneck analysis — average time spent per status stage | P1 |
| FR-AR-09 | Ad-hoc query access for analysts via SQL interface | P1 |

### 8.5 Alerting & Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AN-01 | Alert when an order exceeds SLA threshold (configurable per service type) | P0 |
| FR-AN-02 | Alert when order is stuck in a status beyond expected duration | P0 |
| FR-AN-03 | Alert on data pipeline failures or latency breaches | P0 |
| FR-AN-04 | Alert on source system data freshness degradation | P1 |
| FR-AN-05 | Notification to project manager when child order status changes | P2 |

---

## 9. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Data latency (source to queryable) | ≤ 5 minutes (streaming), ≤ 20 minutes (batch) |
| NFR-02 | System availability | 99.9% uptime |
| NFR-03 | Query performance (dashboard) | p95 ≤ 3 seconds |
| NFR-04 | Data retention | 7 years (curated), 10 years (archive) |
| NFR-05 | Scalability | Support 500K+ orders/day across all services |
| NFR-06 | Data completeness | ≥ 99.5% of source records captured |
| NFR-07 | Disaster recovery | RPO ≤ 1 hour, RTO ≤ 4 hours |
| NFR-08 | Security | Encryption at rest and in transit; RBAC |
| NFR-09 | Audit trail | All data access logged with user/timestamp |
| NFR-10 | Compliance | SOX-compliant data controls for order/financial data |

---

## 10. Data Governance & Security

### 10.1 Access Control

| Role | Access Level |
|------|-------------|
| Data Engineer | Full pipeline access; read/write to all layers |
| Data Analyst | Read access to curated/analytics layer; SQL query access |
| Operations Manager | Dashboard access; alert management |
| Project Manager | Project-scoped view; associated order details |
| Executive | Aggregate dashboards and summary reports |
| External Auditor | Read-only historical data with PII masking |

### 10.2 Data Classification

| Data Element | Classification | Handling |
|--------------|---------------|----------|
| Customer ID / Name | PII | Encrypted; access-controlled |
| Location (CLLI) | Internal | Standard access controls |
| Order Status / Dates | Internal | Standard access controls |
| Pricing / Contract Terms | Confidential | Restricted access; audit logged |
| Circuit IDs | Internal | Standard access controls |

### 10.3 Data Lineage

- Full column-level lineage from source to serving layer
- Impact analysis capability for schema changes
- Lineage metadata stored in a data catalog (e.g., Apache Atlas, DataHub, or cloud-native equivalent)

---

## 11. Key Performance Indicators (KPIs)

| KPI | Definition | Target |
|-----|-----------|--------|
| On-Time Delivery Rate | Orders completed ≤ committed_due_date / Total completed | ≥ 95% |
| Average Cycle Time | Mean days from order creation to completion | Varies by service |
| Order Fallout Rate | Orders cancelled or failed / Total orders | ≤ 5% |
| Stuck Order Count | Orders exceeding 2x avg time in current status | ≤ 2% of active |
| Data Freshness | Time since last successful source sync | ≤ pipeline SLA |
| Pipeline Success Rate | Successful pipeline runs / Total scheduled runs | ≥ 99.5% |

### 11.1 Service-Specific Cycle Time Targets

| Service Type | New Order Target | Change Order Target |
|--------------|-----------------|-------------------|
| Ethernet | ≤ 30 business days | ≤ 15 business days |
| OCN | ≤ 45 business days | ≤ 20 business days |
| DS1 | ≤ 10 business days | ≤ 5 business days |
| DS3 | ≤ 15 business days | ≤ 7 business days |
| Project Mgmt | Per project plan | Per change request |

---

## 12. Integration Points

| System | Direction | Protocol | Purpose |
|--------|-----------|----------|---------|
| Ethernet OSS | Inbound | Kafka / CDC | Order events |
| OCN Provisioning | Inbound | Kafka / CDC | Order events |
| DS1/DS3 Legacy OSS | Inbound | SFTP / JDBC | Batch order extracts |
| Project Mgmt Tool | Inbound | REST API | Project order data |
| Customer Master | Inbound | API / Batch | Customer reference data |
| CLLI Database | Inbound | Batch / API | Location enrichment |
| BI/Dashboard Tool | Outbound | SQL / ODBC | Reporting |
| Alerting Platform | Outbound | Webhook / API | Notifications |
| Data Catalog | Bidirectional | API | Metadata & lineage |

---

## 13. Milestones & Delivery Plan

| Phase | Scope | Duration | Target Completion |
|-------|-------|----------|-------------------|
| Phase 1 | Ethernet + DS1 ingestion, raw/curated layers, basic dashboards | 8 weeks | Q4 2026 |
| Phase 2 | OCN + DS3 ingestion, SLA tracking, alerting engine | 6 weeks | Q4 2026 |
| Phase 3 | Project Mgmt integration, cross-service linking, advanced analytics | 6 weeks | Q1 2027 |
| Phase 4 | Data quality automation, lineage, self-service analytics | 4 weeks | Q1 2027 |
| Phase 5 | Performance tuning, DR testing, production hardening | 4 weeks | Q2 2027 |

---

## 14. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Legacy DS1/DS3 systems lack reliable CDC | Data latency for TDM services | High | Implement frequent batch polling (15 min); plan API wrapper |
| Inconsistent customer IDs across systems | Failed cross-service linking | Medium | Build customer ID resolution service with fuzzy matching |
| Source system schema changes without notice | Pipeline failures | Medium | Schema registry; contract testing; alerting on schema drift |
| High order volume spikes (seasonal) | Pipeline backpressure / delays | Low | Auto-scaling infrastructure; backpressure handling in Kafka |
| Data quality issues in source systems | Incorrect reporting / SLA metrics | High | Quarantine bad records; DQ scoring; source team feedback loops |

---

## 15. Dependencies

- Access to source system databases or event streams (Ethernet OSS, OCN, DS1/DS3, PM Tool)
- Customer Master data service availability
- CLLI code reference database
- Cloud infrastructure provisioning (compute, storage, networking)
- BI tool licensing and deployment
- Data catalog tool selection and deployment
- Network connectivity between on-premise legacy systems and cloud platform

---

## 16. Assumptions

1. Source systems will provide at minimum a daily full extract as fallback for CDC failures
2. All orders have a unique identifier within their source system
3. Customer IDs are consistent enough for ≥ 95% automated matching
4. Historical data (24 months minimum) will be available for initial backfill
5. Project Management orders always reference child service orders by their source system order IDs
6. CLLI codes are standardized across all source systems

---

## 17. Glossary

| Term | Definition |
|------|-----------|
| CDC | Change Data Capture — technique for capturing row-level changes in a database |
| CLLI | Common Language Location Identifier — standard code for telecom locations |
| DS1 | Digital Signal 1 — 1.544 Mbps TDM circuit (T1) |
| DS3 | Digital Signal 3 — 44.736 Mbps TDM circuit (T3) |
| E-LAN | Ethernet LAN — multipoint-to-multipoint Ethernet service |
| E-Line | Ethernet Line — point-to-point Ethernet service |
| ESF | Extended Super Frame — DS1 framing format |
| OCN | Optical Carrier Network — SONET-based optical transport |
| OSS | Operations Support System |
| SCD | Slowly Changing Dimension — technique for tracking historical changes |
| SLA | Service Level Agreement |
| SONET | Synchronous Optical Network |
| TDM | Time Division Multiplexing |

---

## 18. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Data Engineering Lead | | | |
| Platform Architect | | | |
| Operations Stakeholder | | | |
| Security/Compliance | | | |

---

*End of Document*
