# Order Tracking System — Project Patatas

A data engineering demonstration platform for tracking telecom service orders across five service types: **Ethernet**, **OCN**, **DS1**, **DS3**, and **Project Management Services**.

Built to support PRD discussions around unified order visibility, SLA monitoring, and operational analytics for telecom provisioning systems.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## Overview

This project implements the **serving/consumption layer** of an order tracking data platform as described in the accompanying PRD. It demonstrates:

- **Unified order view** across 5 disparate source systems with canonical status normalization
- **SLA tracking** with cycle time targets, breach risk detection, and on-time delivery metrics
- **Project management rollups** linking child service orders to parent projects
- **Alerting** for SLA breaches, stuck orders, and data freshness degradation
- **Analytics** including bottleneck analysis, volume trends, and service distribution
- **Data quality monitoring** with completeness, validity, and freshness scores

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL with custom `order_tracking` schema) |
| Database | 5 service tables, unified view, materialized SLA metrics, status history (SCD2) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                  │
│  Dashboard │ Orders │ SLA │ Projects │ Alerts │ ...  │
└──────────────────────┬──────────────────────────────┘
                       │ Supabase JS Client
                       ▼
┌─────────────────────────────────────────────────────┐
│  Supabase (PostgREST API)                            │
│  public schema views → order_tracking schema         │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  PostgreSQL (order_tracking schema)                   │
│  ┌───────────┬─────────┬────────┬────────┬────────┐ │
│  │ ethernet  │   ocn   │  ds1   │  ds3   │project │ │
│  │ _orders   │ _orders │_orders │_orders │_orders │ │
│  └───────────┴─────────┴────────┴────────┴────────┘ │
│  unified_orders_view │ sla_metrics │ alerts          │
│  order_status_history │ project_rollup_view          │
└─────────────────────────────────────────────────────┘
```

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with KPI cards, volume trends, status/service charts |
| `/orders` | Unified order search with filters, sorting, pagination, CSV export |
| `/orders/[service]/[id]` | Order detail with workflow progress, timeline, SLA metrics |
| `/sla` | SLA compliance tracking, cycle time vs targets, aging analysis |
| `/projects` | Project management rollups with linked order progress |
| `/alerts` | Alert management with severity filtering and acknowledgment |
| `/analytics` | Historical trends, bottleneck analysis, on-time delivery trends |
| `/data-quality` | Data completeness, validity, freshness scores by service |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (or use the connected instance)

### Setup

```bash
cd order-tracking-dashboard
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run

```bash
npm run dev
```

Open http://localhost:3000

### Database

Migrations are in `supabase/migrations/`. Apply them with:

```bash
cd supabase
npx supabase db push --linked
```

---

## Data Model

The system normalizes orders from 5 source systems into a unified canonical status taxonomy:

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

## Note

This project uses **synthetic data** for demonstration and discussion purposes. No real customer or network data is included. The PRD (`ORDER_TRACKING_PRD.md`) describes the full production system requirements.

---

## License

Internal use — Data Engineering Team discussion material.
