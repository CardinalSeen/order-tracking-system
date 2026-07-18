"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/Card";
import ChartCard from "@/components/ChartCard";
import StatusBadge from "@/components/StatusBadge";
import ServiceBadge from "@/components/ServiceBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { UnifiedOrder, CanonicalStatus, ServiceType, SERVICE_LABELS } from "@/lib/types";
import { Package, AlertTriangle, CheckCircle, Clock, TrendingUp, Activity, ArrowUpRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#3b82f6",
  DESIGN: "#8b5cf6",
  IN_PROGRESS: "#f59e0b",
  TESTING: "#f97316",
  COMPLETE: "#10b981",
  ON_HOLD: "#64748b",
  CANCELLED: "#ef4444",
};

const SERVICE_COLORS: Record<string, string> = {
  ethernet: "#6366f1",
  ocn: "#14b8a6",
  ds1: "#f59e0b",
  ds3: "#f43f5e",
  project_management: "#8b5cf6",
};

interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  atRiskOrders: number;
  avgCycleTime: number;
  onTimeRate: number;
  byService: { name: string; value: number; key: string }[];
  byStatus: { name: string; value: number }[];
  ordersByMonth: { month: string; count: number }[];
  recentOrders: UnifiedOrder[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: orders } = await supabase
          .from("unified_orders_view")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: slaData } = await supabase
          .from("sla_metrics")
          .select("*");

        if (!orders || orders.length === 0) {
          setStats({
            totalOrders: 0, activeOrders: 0, completedOrders: 0, atRiskOrders: 0,
            avgCycleTime: 0, onTimeRate: 0, byService: [], byStatus: [],
            ordersByMonth: [], recentOrders: [],
          });
          setLoading(false);
          return;
        }

        const totalOrders = orders.length;
        const completedOrders = orders.filter((o) => o.canonical_status === "COMPLETE").length;
        const activeOrders = orders.filter((o) => !["COMPLETE", "CANCELLED"].includes(o.canonical_status || "")).length;

        const serviceMap: Record<string, number> = {};
        orders.forEach((o) => { serviceMap[o.service_type] = (serviceMap[o.service_type] || 0) + 1; });
        const byService = Object.entries(serviceMap).map(([key, value]) => ({
          name: SERVICE_LABELS[key as ServiceType] || key, value, key,
        }));

        const statusMap: Record<string, number> = {};
        orders.forEach((o) => { statusMap[o.canonical_status || "UNKNOWN"] = (statusMap[o.canonical_status || "UNKNOWN"] || 0) + 1; });
        const byStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        const monthMap: Record<string, number> = {};
        orders.forEach((o) => {
          const month = new Date(o.created_at).toISOString().slice(0, 7);
          monthMap[month] = (monthMap[month] || 0) + 1;
        });
        const ordersByMonth = Object.entries(monthMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)
          .map(([month, count]) => ({ month, count }));

        const atRiskOrders = slaData?.filter((m) => m.breach_risk).length || 0;
        const completedWithCycle = (slaData || []).filter((m) => m.cycle_time != null && m.canonical_status === "COMPLETE");
        const avgCycleTime = completedWithCycle.length > 0
          ? Math.round(completedWithCycle.reduce((sum, o) => sum + (o.cycle_time || 0), 0) / completedWithCycle.length)
          : 0;
        const onTimeCount = completedWithCycle.filter((o) => (o.sla_variance_days || 0) <= 0).length;
        const onTimeRate = completedWithCycle.length > 0
          ? Math.round((onTimeCount / completedWithCycle.length) * 100) : 0;

        setStats({
          totalOrders, activeOrders, completedOrders, atRiskOrders, avgCycleTime,
          onTimeRate, byService, byStatus, ordersByMonth,
          recentOrders: orders.slice(0, 8) as UnifiedOrder[],
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Real-time order tracking across all telecom services
          </p>
        </div>
        <p className="text-[11px] text-slate-400 font-medium bg-white border border-slate-200 rounded-lg px-3 py-1.5">
          Last sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <Card title="Total Orders" value={stats.totalOrders} subtitle="All services" icon={<Package size={20} />} accentColor="bg-blue-50 text-blue-600" />
        <Card title="Active" value={stats.activeOrders} subtitle="In progress" icon={<Clock size={20} />} accentColor="bg-amber-50 text-amber-600" />
        <Card title="Completed" value={stats.completedOrders} subtitle="Delivered" icon={<CheckCircle size={20} />} accentColor="bg-emerald-50 text-emerald-600" />
        <Card title="At Risk" value={stats.atRiskOrders} subtitle="SLA breach risk" icon={<AlertTriangle size={20} />} accentColor="bg-red-50 text-red-600" />
        <Card title="On-Time" value={`${stats.onTimeRate}%`} subtitle="Target ≥95%" icon={<TrendingUp size={20} />} accentColor="bg-violet-50 text-violet-600" />
        <Card title="Cycle Time" value={`${stats.avgCycleTime}d`} subtitle="Avg business days" icon={<Activity size={20} />} accentColor="bg-teal-50 text-teal-600" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Order Volume" subtitle="Monthly trend" className="lg:col-span-2">
          {stats.ordersByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats.ordersByMonth}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorCount)" dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[12px] text-slate-400 text-center py-16">No trend data available</p>
          )}
        </ChartCard>

        {/* SLA Gauge */}
        <ChartCard title="SLA Compliance" subtitle="On-time delivery">
          <div className="flex flex-col items-center justify-center h-[240px]">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={stats.onTimeRate >= 95 ? "#059669" : stats.onTimeRate >= 80 ? "#d97706" : "#dc2626"}
                  strokeWidth="10"
                  strokeDasharray={`${stats.onTimeRate * 2.39} 239`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] font-bold text-slate-900 tracking-tight">{stats.onTimeRate}%</span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">On-time</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${stats.onTimeRate >= 95 ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className={`text-[11px] font-medium ${stats.onTimeRate >= 95 ? "text-emerald-600" : "text-red-600"}`}>
                {stats.onTimeRate >= 95 ? "Target met" : "Below target (95%)"}
              </span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <ChartCard title="By Service Type" subtitle="Order distribution">
          {stats.byService.length > 0 ? (
            <div className="space-y-3">
              {stats.byService.map((entry) => {
                const pct = stats.totalOrders > 0 ? Math.round((entry.value / stats.totalOrders) * 100) : 0;
                return (
                  <div key={entry.key} className="flex items-center gap-3">
                    <span className="text-[12px] text-slate-600 font-medium w-28 truncate">{entry.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: SERVICE_COLORS[entry.key] || "#6366f1" }}
                      />
                    </div>
                    <span className="text-[12px] font-semibold text-slate-700 w-8 text-right">{entry.value}</span>
                    <span className="text-[10px] text-slate-400 w-8">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-slate-400 text-center py-16">No data</p>
          )}
        </ChartCard>

        <ChartCard title="By Status" subtitle="Current distribution">
          {stats.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.byStatus.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[12px] text-slate-400 text-center py-16">No data</p>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {stats.byStatus.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name] || "#94a3b8" }} />
                <span className="text-[11px] text-slate-500">{entry.name.replace("_", " ")} ({entry.value})</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Recent Orders */}
      <ChartCard
        title="Recent Orders"
        subtitle="Latest orders across all services"
        action={
          <Link href="/orders" className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors">
            View all <ArrowUpRight size={12} />
          </Link>
        }
      >
        {stats.recentOrders.length === 0 ? (
          <p className="text-slate-400 text-[12px] text-center py-8">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Order ID</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-3 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order, idx) => (
                  <tr key={order.id} className={`hover:bg-slate-50/80 transition-colors ${idx !== stats.recentOrders.length - 1 ? "border-b border-slate-50" : ""}`}>
                    <td className="py-3 px-6">
                      <Link href={`/orders/${order.service_type}/${order.order_id}`} className="font-mono text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                        {order.order_id}
                      </Link>
                    </td>
                    <td className="py-3 px-3"><ServiceBadge service={order.service_type} /></td>
                    <td className="py-3 px-3 text-slate-600">{order.order_type || "—"}</td>
                    <td className="py-3 px-3"><StatusBadge status={order.canonical_status} /></td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{order.customer_id}</td>
                    <td className="py-3 px-6 text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
