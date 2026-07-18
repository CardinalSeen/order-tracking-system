"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import ServiceBadge from "@/components/ServiceBadge";
import Card from "@/components/Card";
import ChartCard from "@/components/ChartCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SlaMetric, ServiceType, SERVICE_LABELS, CYCLE_TIME_TARGETS } from "@/lib/types";
import { AlertTriangle, TrendingUp, Clock, Target, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

export default function SlaPage() {
  const [metrics, setMetrics] = useState<SlaMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const { data } = await supabase
          .from("sla_metrics")
          .select("*")
          .order("days_in_current_status", { ascending: false });

        setMetrics((data as SlaMetric[]) || []);
      } catch (err) {
        console.error("Error fetching SLA metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  const filteredMetrics = serviceFilter === "all"
    ? metrics
    : metrics.filter((m) => m.service_type === serviceFilter);

  const atRiskOrders = filteredMetrics.filter((m) => m.breach_risk);
  const completedOrders = filteredMetrics.filter((m) => m.canonical_status === "COMPLETE");
  const avgCycleTime =
    completedOrders.length > 0
      ? Math.round(
          completedOrders.reduce((sum, o) => sum + (o.cycle_time || 0), 0) / completedOrders.length
        )
      : 0;

  const onTimeCount = completedOrders.filter((o) => (o.sla_variance_days || 0) <= 0).length;
  const onTimeRate =
    completedOrders.length > 0 ? Math.round((onTimeCount / completedOrders.length) * 100) : 0;

  // Cycle time by service for chart
  const cycleTimeByService = Object.entries(
    filteredMetrics.reduce<Record<string, number[]>>((acc, m) => {
      if (m.cycle_time != null && m.canonical_status === "COMPLETE") {
        if (!acc[m.service_type]) acc[m.service_type] = [];
        acc[m.service_type].push(m.cycle_time);
      }
      return acc;
    }, {})
  ).map(([service, times]) => ({
    service: SERVICE_LABELS[service as ServiceType] || service,
    avg: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
    target: CYCLE_TIME_TARGETS.find((t) => t.service_type === service && t.order_type === "New")?.target_days || 30,
  }));

  // Days in status distribution
  const statusAgingData = filteredMetrics
    .filter((m) => !["COMPLETE", "CANCELLED"].includes(m.canonical_status))
    .reduce<Record<string, { bucket: string; count: number }[]>>((acc, m) => {
      const days = m.days_in_current_status || 0;
      let bucket: string;
      if (days <= 5) bucket = "0-5 days";
      else if (days <= 10) bucket = "6-10 days";
      else if (days <= 20) bucket = "11-20 days";
      else if (days <= 30) bucket = "21-30 days";
      else bucket = "30+ days";

      if (!acc[bucket]) acc[bucket] = [];
      return acc;
    }, {});

  const agingBuckets = ["0-5 days", "6-10 days", "11-20 days", "21-30 days", "30+ days"];
  const agingData = agingBuckets.map((bucket) => {
    const count = filteredMetrics.filter((m) => {
      if (["COMPLETE", "CANCELLED"].includes(m.canonical_status)) return false;
      const days = m.days_in_current_status || 0;
      switch (bucket) {
        case "0-5 days": return days <= 5;
        case "6-10 days": return days > 5 && days <= 10;
        case "11-20 days": return days > 10 && days <= 20;
        case "21-30 days": return days > 20 && days <= 30;
        case "30+ days": return days > 30;
        default: return false;
      }
    }).length;
    return { bucket, count };
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">SLA Metrics</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Service level agreement tracking and compliance monitoring
          </p>
        </div>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white"
        >
          <option value="all">All Services</option>
          <option value="ethernet">Ethernet</option>
          <option value="ocn">OCN</option>
          <option value="ds1">DS1</option>
          <option value="ds3">DS3</option>
          <option value="project_management">Project Mgmt</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card
          title="On-Time Delivery"
          value={`${onTimeRate}%`}
          subtitle="Target: ≥ 95%"
          icon={<Target size={24} />}
        />
        <Card
          title="Avg Cycle Time"
          value={`${avgCycleTime} days`}
          subtitle="Completed orders"
          icon={<TrendingUp size={24} />}
        />
        <Card
          title="At-Risk Orders"
          value={atRiskOrders.length}
          subtitle="Breach risk detected"
          icon={<AlertTriangle size={24} />}
        />
        <Card
          title="Total Tracked"
          value={filteredMetrics.length}
          subtitle="In SLA view"
          icon={<Clock size={24} />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard title="Average Cycle Time vs Target" subtitle="Business days by service type">
          {cycleTimeByService.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cycleTimeByService}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="service" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: "Days", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avg" name="Actual Avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No completed orders with cycle time data yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Order Aging Distribution" subtitle="Active orders by days in current status">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                {agingData.map((entry, idx) => (
                  <Cell
                    key={entry.bucket}
                    fill={idx < 2 ? "#10b981" : idx < 4 ? "#f59e0b" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cycle Time Targets Reference */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cycle Time Targets (Business Days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["ethernet", "ocn", "ds1", "ds3"].map((svc) => {
            const newTarget = CYCLE_TIME_TARGETS.find((t) => t.service_type === svc && t.order_type === "New");
            const changeTarget = CYCLE_TIME_TARGETS.find((t) => t.service_type === svc && t.order_type === "Change");
            return (
              <div key={svc} className="border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2 capitalize">{svc.replace("_", " ")}</h3>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">
                    New: <span className="font-medium text-gray-700">≤ {newTarget?.target_days}d</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Change: <span className="font-medium text-gray-700">≤ {changeTarget?.target_days}d</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* At-Risk Orders */}
      {atRiskOrders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Orders at Risk of SLA Breach ({atRiskOrders.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-red-200">
                  <th className="text-left py-2 px-3 text-red-700 font-medium">Order ID</th>
                  <th className="text-left py-2 px-3 text-red-700 font-medium">Service</th>
                  <th className="text-left py-2 px-3 text-red-700 font-medium">Status</th>
                  <th className="text-left py-2 px-3 text-red-700 font-medium">Days in Status</th>
                  <th className="text-left py-2 px-3 text-red-700 font-medium">SLA Variance</th>
                  <th className="text-left py-2 px-3 text-red-700 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {atRiskOrders.map((m) => (
                  <tr key={`${m.order_id}-${m.service_type}`} className="border-t border-red-100">
                    <td className="py-2 px-3">
                      <a href={`/orders/${m.service_type}/${m.order_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {m.order_id}
                      </a>
                    </td>
                    <td className="py-2 px-3">
                      <ServiceBadge service={m.service_type} />
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={m.canonical_status} />
                    </td>
                    <td className="py-2 px-3 font-medium">{m.days_in_current_status ?? "—"}</td>
                    <td className="py-2 px-3 text-red-700 font-medium">
                      {m.sla_variance_days != null
                        ? `${m.sla_variance_days > 0 ? "+" : ""}${m.sla_variance_days} days`
                        : "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {m.committed_due_date ? new Date(m.committed_due_date).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All SLA Metrics Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Orders - SLA Overview</h2>
        {filteredMetrics.length === 0 ? (
          <p className="text-gray-500 text-sm">No SLA data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Order ID</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Service</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Days in Status</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Cycle Time</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">SLA Variance</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.slice(0, 100).map((m) => (
                  <tr key={`${m.order_id}-${m.service_type}`} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <a href={`/orders/${m.service_type}/${m.order_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {m.order_id}
                      </a>
                    </td>
                    <td className="py-3 px-3">
                      <ServiceBadge service={m.service_type} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={m.canonical_status} />
                    </td>
                    <td className="py-3 px-3">{m.days_in_current_status ?? "—"}</td>
                    <td className="py-3 px-3">
                      {m.cycle_time != null ? `${m.cycle_time} days` : "—"}
                    </td>
                    <td className="py-3 px-3">
                      {m.sla_variance_days != null ? (
                        <span className={m.sla_variance_days > 0 ? "text-red-600 font-medium" : "text-green-600"}>
                          {m.sla_variance_days > 0 ? "+" : ""}{m.sla_variance_days}d
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-3">
                      {m.breach_risk ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ⚠ At Risk
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs">✓ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
