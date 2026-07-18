"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/Card";
import ChartCard from "@/components/ChartCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { ServiceType, SERVICE_LABELS, CYCLE_TIME_TARGETS } from "@/lib/types";
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Activity, Percent } from "lucide-react";
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  ReferenceLine,
} from "recharts";

const SERVICE_COLORS: Record<string, string> = {
  ethernet: "#6366f1",
  ocn: "#14b8a6",
  ds1: "#f59e0b",
  ds3: "#f43f5e",
  project_management: "#8b5cf6",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#3b82f6",
  DESIGN: "#8b5cf6",
  IN_PROGRESS: "#f59e0b",
  TESTING: "#f97316",
  COMPLETE: "#10b981",
  ON_HOLD: "#6b7280",
  CANCELLED: "#ef4444",
};

interface AnalyticsData {
  totalOrders: number;
  avgCycleTime: number;
  completionRate: number;
  falloutRate: number;
  ordersByMonth: { month: string; total: number; ethernet: number; ocn: number; ds1: number; ds3: number; project_management: number }[];
  cycleTimeByService: { service: string; actual: number; target: number }[];
  statusDistribution: { name: string; value: number }[];
  serviceDistribution: { name: string; value: number }[];
  bottleneckAnalysis: { status: string; avgDays: number; orderCount: number }[];
  completionTrend: { month: string; onTime: number; late: number; rate: number }[];
  orderTypeBreakdown: { type: string; count: number }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<string>("12");

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const { data: orders } = await supabase.from("unified_orders_view").select("*");
        const { data: slaData } = await supabase.from("sla_metrics").select("*");
        const { data: historyData } = await supabase
          .from("order_status_history")
          .select("*")
          .eq("is_current", false);

        if (!orders || orders.length === 0) {
          setData(null);
          setLoading(false);
          return;
        }

        const totalOrders = orders.length;

        // Filter by time period
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(timePeriod));

        // Orders by month with service breakdown
        const monthServiceMap: Record<string, Record<string, number>> = {};
        orders.forEach((o) => {
          const month = new Date(o.created_at).toISOString().slice(0, 7);
          if (!monthServiceMap[month]) {
            monthServiceMap[month] = { total: 0, ethernet: 0, ocn: 0, ds1: 0, ds3: 0, project_management: 0 };
          }
          monthServiceMap[month].total++;
          monthServiceMap[month][o.service_type] = (monthServiceMap[month][o.service_type] || 0) + 1;
        });
        const ordersByMonth = Object.entries(monthServiceMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-parseInt(timePeriod))
          .map(([month, counts]) => ({ month, ...counts })) as AnalyticsData["ordersByMonth"];

        // Status distribution
        const statusMap: Record<string, number> = {};
        orders.forEach((o) => {
          const s = o.canonical_status || "UNKNOWN";
          statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const statusDistribution = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

        // Service distribution
        const serviceMap: Record<string, number> = {};
        orders.forEach((o) => {
          serviceMap[o.service_type] = (serviceMap[o.service_type] || 0) + 1;
        });
        const serviceDistribution = Object.entries(serviceMap).map(([name, value]) => ({
          name: SERVICE_LABELS[name as ServiceType] || name,
          value,
        }));

        // Cycle time by service vs target
        const cycleTimeMap: Record<string, number[]> = {};
        (slaData || []).forEach((m) => {
          if (m.cycle_time != null && m.canonical_status === "COMPLETE") {
            if (!cycleTimeMap[m.service_type]) cycleTimeMap[m.service_type] = [];
            cycleTimeMap[m.service_type].push(m.cycle_time);
          }
        });
        const cycleTimeByService = Object.entries(cycleTimeMap).map(([service, times]) => ({
          service: SERVICE_LABELS[service as ServiceType] || service,
          actual: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
          target: CYCLE_TIME_TARGETS.find((t) => t.service_type === service && t.order_type === "New")?.target_days || 30,
        }));

        // Average cycle time
        const allCycleTimes = (slaData || [])
          .filter((m) => m.cycle_time != null)
          .map((m) => m.cycle_time as number);
        const avgCycleTime = allCycleTimes.length > 0
          ? Math.round(allCycleTimes.reduce((s, t) => s + t, 0) / allCycleTimes.length)
          : 0;

        // Completion and fallout rates
        const completedOrders = orders.filter((o) => o.canonical_status === "COMPLETE").length;
        const cancelledOrders = orders.filter((o) => o.canonical_status === "CANCELLED").length;
        const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
        const falloutRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

        // Bottleneck analysis — avg time spent in each status
        const statusDurations: Record<string, number[]> = {};
        (historyData || []).forEach((h) => {
          if (h.effective_from && h.effective_to) {
            const days = Math.round(
              (new Date(h.effective_to).getTime() - new Date(h.effective_from).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days >= 0) {
              const status = h.canonical_status || h.new_status;
              if (!statusDurations[status]) statusDurations[status] = [];
              statusDurations[status].push(days);
            }
          }
        });
        const bottleneckAnalysis = Object.entries(statusDurations)
          .map(([status, durations]) => ({
            status: status.replace("_", " "),
            avgDays: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length),
            orderCount: durations.length,
          }))
          .sort((a, b) => b.avgDays - a.avgDays);

        // Completion trend by month
        const completionByMonth: Record<string, { onTime: number; late: number }> = {};
        (slaData || [])
          .filter((m) => m.canonical_status === "COMPLETE" && m.actual_completion_date)
          .forEach((m) => {
            const month = new Date(m.actual_completion_date!).toISOString().slice(0, 7);
            if (!completionByMonth[month]) completionByMonth[month] = { onTime: 0, late: 0 };
            if ((m.sla_variance_days || 0) <= 0) {
              completionByMonth[month].onTime++;
            } else {
              completionByMonth[month].late++;
            }
          });
        const completionTrend = Object.entries(completionByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-parseInt(timePeriod))
          .map(([month, counts]) => ({
            month,
            ...counts,
            rate: Math.round((counts.onTime / (counts.onTime + counts.late)) * 100),
          }));

        // Order type breakdown
        const typeMap: Record<string, number> = {};
        orders.forEach((o) => {
          const t = o.order_type || "Unknown";
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const orderTypeBreakdown = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

        setData({
          totalOrders,
          avgCycleTime,
          completionRate,
          falloutRate,
          ordersByMonth,
          cycleTimeByService,
          statusDistribution,
          serviceDistribution,
          bottleneckAnalysis,
          completionTrend,
          orderTypeBreakdown,
        });
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [timePeriod]);

  if (loading) return <LoadingSpinner />;

  if (!data || data.totalOrders === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
        <EmptyState
          icon={<BarChart3 size={48} />}
          title="No data available for analytics."
          description="Add orders to see trend analysis and reporting."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Historical trends, bottleneck analysis, and operational insights
          </p>
        </div>
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white"
        >
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
          <option value="24">Last 24 months</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Total Orders" value={data.totalOrders} icon={<BarChart3 size={24} />} />
        <Card title="Avg Cycle Time" value={`${data.avgCycleTime}d`} subtitle="Business days" icon={<TrendingUp size={24} />} />
        <Card title="Completion Rate" value={`${data.completionRate}%`} icon={<PieChartIcon size={24} />} />
        <Card
          title="Fallout Rate"
          value={`${data.falloutRate}%`}
          subtitle={`Target: ≤ 5%`}
          icon={<Activity size={24} />}
        />
      </div>

      {/* Order Volume Trend with Service Breakdown */}
      <ChartCard title="Order Volume Trend" subtitle="Monthly volume by service type" className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.ordersByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="ethernet" name="Ethernet" stackId="1" fill="#6366f1" stroke="#6366f1" fillOpacity={0.8} />
            <Area type="monotone" dataKey="ocn" name="OCN" stackId="1" fill="#14b8a6" stroke="#14b8a6" fillOpacity={0.8} />
            <Area type="monotone" dataKey="ds1" name="DS1" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.8} />
            <Area type="monotone" dataKey="ds3" name="DS3" stackId="1" fill="#f43f5e" stroke="#f43f5e" fillOpacity={0.8} />
            <Area type="monotone" dataKey="project_management" name="Project Mgmt" stackId="1" fill="#8b5cf6" stroke="#8b5cf6" fillOpacity={0.8} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Row 2: Cycle Time + On-Time Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Cycle Time: Actual vs Target" subtitle="Average days to complete by service">
          {data.cycleTimeByService.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.cycleTimeByService}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="service" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} label={{ value: "Days", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No cycle time data yet.</p>
          )}
        </ChartCard>

        <ChartCard title="On-Time Delivery Trend" subtitle="Monthly SLA compliance rate">
          {data.completionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={data.completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="onTime" name="On Time" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="late" name="Late" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" name="On-Time %" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <ReferenceLine yAxisId="right" y={95} stroke="#10b981" strokeDasharray="3 3" label="Target 95%" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">No completion trend data yet.</p>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.statusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(name || "").replace("_", " ")} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                {data.statusDistribution.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Service Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.serviceDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name || ""} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                {data.serviceDistribution.map((entry, idx) => {
                  const key = Object.entries(SERVICE_LABELS).find(([, v]) => v === entry.name)?.[0];
                  return <Cell key={entry.name} fill={SERVICE_COLORS[key || ""] || `hsl(${idx * 70}, 60%, 50%)`} />;
                })}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Order Type Breakdown">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.orderTypeBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 12 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bottleneck Analysis */}
      <ChartCard title="Bottleneck Analysis" subtitle="Average time spent in each status stage (completed orders)" className="mb-6">
        {data.bottleneckAnalysis.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.bottleneckAnalysis} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: "Avg Days", position: "insideBottom", offset: -5 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="avgDays" name="Avg Days" radius={[0, 4, 4, 0]}>
                  {data.bottleneckAnalysis.map((entry, idx) => (
                    <Cell key={entry.status} fill={entry.avgDays > 10 ? "#ef4444" : entry.avgDays > 5 ? "#f59e0b" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Status Stage Details</h4>
              <div className="space-y-2">
                {data.bottleneckAnalysis.map((entry) => (
                  <div key={entry.status} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700 capitalize">{entry.status}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">{entry.orderCount} orders</span>
                      <span className={`text-sm font-medium ${entry.avgDays > 10 ? "text-red-600" : entry.avgDays > 5 ? "text-yellow-600" : "text-green-600"}`}>
                        {entry.avgDays} days avg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-12">No bottleneck data available. Status history records are needed for this analysis.</p>
        )}
      </ChartCard>
    </div>
  );
}
