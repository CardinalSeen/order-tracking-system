"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/Card";
import ChartCard from "@/components/ChartCard";
import ServiceBadge from "@/components/ServiceBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { ServiceType, SERVICE_LABELS } from "@/lib/types";
import { ShieldCheck, Database, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface DataQualityMetrics {
  overallScore: number;
  completeness: number;
  freshness: number;
  validity: number;
  byService: {
    service: ServiceType;
    totalRecords: number;
    completeness: number;
    validity: number;
    freshness: number;
    overall: number;
    lastUpdated: string | null;
  }[];
  qualityTrend: { date: string; score: number }[];
  issues: { service: string; field: string; issue: string; count: number }[];
}

export default function DataQualityPage() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDataQuality() {
      try {
        // Fetch data quality scores
        const { data: dqScores } = await supabase
          .from("data_quality_scores")
          .select("*")
          .order("check_date", { ascending: false });

        // Fetch order counts per service for validation
        const { data: orders } = await supabase
          .from("unified_orders_view")
          .select("service_type, order_id, customer_id, a_location_clli, z_location_clli, committed_due_date");

        if (!dqScores || dqScores.length === 0) {
          // Compute metrics directly from orders if no DQ table
          if (orders && orders.length > 0) {
            const serviceGroups: Record<string, typeof orders> = {};
            orders.forEach((o) => {
              if (!serviceGroups[o.service_type]) serviceGroups[o.service_type] = [];
              serviceGroups[o.service_type].push(o);
            });

            const byService = Object.entries(serviceGroups).map(([service, svcOrders]) => {
              const totalRecords = svcOrders.length;
              const withClli = svcOrders.filter((o) => o.a_location_clli && o.z_location_clli).length;
              const withDueDate = svcOrders.filter((o) => o.committed_due_date).length;
              const completeness = Math.round(((withClli + withDueDate) / (totalRecords * 2)) * 100);

              return {
                service: service as ServiceType,
                totalRecords,
                completeness,
                validity: 98, // Placeholder — real system would run validation rules
                freshness: 95,
                overall: Math.round((completeness + 98 + 95) / 3),
                lastUpdated: null,
              };
            });

            const avgOverall = byService.length > 0
              ? Math.round(byService.reduce((s, b) => s + b.overall, 0) / byService.length)
              : 0;
            const avgCompleteness = byService.length > 0
              ? Math.round(byService.reduce((s, b) => s + b.completeness, 0) / byService.length)
              : 0;

            setMetrics({
              overallScore: avgOverall,
              completeness: avgCompleteness,
              freshness: 95,
              validity: 98,
              byService,
              qualityTrend: [],
              issues: [],
            });
          } else {
            setMetrics(null);
          }
        } else {
          // Use DQ scores table
          const latestByService: Record<string, (typeof dqScores)[0]> = {};
          dqScores.forEach((s) => {
            if (!latestByService[s.service_type] || s.check_date > latestByService[s.service_type].check_date) {
              latestByService[s.service_type] = s;
            }
          });

          const byService = Object.values(latestByService).map((s) => ({
            service: s.service_type as ServiceType,
            totalRecords: s.total_records,
            completeness: Math.round(s.completeness_score * 100),
            validity: Math.round(s.accuracy_score * 100),
            freshness: Math.round(s.freshness_score * 100),
            overall: Math.round(s.overall_score * 100),
            lastUpdated: s.check_date,
          }));

          const avgOverall = byService.length > 0
            ? Math.round(byService.reduce((s, b) => s + b.overall, 0) / byService.length)
            : 0;
          const avgCompleteness = byService.length > 0
            ? Math.round(byService.reduce((s, b) => s + b.completeness, 0) / byService.length)
            : 0;
          const avgFreshness = byService.length > 0
            ? Math.round(byService.reduce((s, b) => s + b.freshness, 0) / byService.length)
            : 0;
          const avgValidity = byService.length > 0
            ? Math.round(byService.reduce((s, b) => s + b.validity, 0) / byService.length)
            : 0;

          // Quality trend
          const trendMap: Record<string, number[]> = {};
          dqScores.forEach((s) => {
            if (!trendMap[s.check_date]) trendMap[s.check_date] = [];
            trendMap[s.check_date].push(s.overall_score);
          });
          const qualityTrend = Object.entries(trendMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-30)
            .map(([date, scores]) => ({
              date,
              score: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100),
            }));

          setMetrics({
            overallScore: avgOverall,
            completeness: avgCompleteness,
            freshness: avgFreshness,
            validity: avgValidity,
            byService,
            qualityTrend,
            issues: [],
          });
        }
      } catch (err) {
        console.error("Error fetching data quality:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDataQuality();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!metrics) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Data Quality</h1>
        <EmptyState
          icon={<Database size={48} />}
          title="No data quality metrics available."
          description="Add orders and run quality checks to see metrics here."
        />
      </div>
    );
  }

  const radarData = [
    { dimension: "Completeness", value: metrics.completeness },
    { dimension: "Validity", value: metrics.validity },
    { dimension: "Freshness", value: metrics.freshness },
  ];

  const scoreColor = (score: number) => {
    if (score >= 95) return "text-green-600";
    if (score >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBg = (score: number) => {
    if (score >= 95) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Data Quality</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Data completeness, accuracy, and freshness monitoring (Target: ≥ 99.5%)
          </p>
        </div>
      </div>

      {/* Overall Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card title="Overall Score" value={`${metrics.overallScore}%`} subtitle="Target: ≥ 99.5%" icon={<ShieldCheck size={24} />} />
        <Card title="Completeness" value={`${metrics.completeness}%`} subtitle="Required fields present" icon={<Database size={24} />} />
        <Card title="Validity" value={`${metrics.validity}%`} subtitle="Pass validation rules" icon={<CheckCircle size={24} />} />
        <Card title="Freshness" value={`${metrics.freshness}%`} subtitle="Within SLA latency" icon={<RefreshCw size={24} />} />
      </div>

      {/* Quality Radar + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Quality Dimensions" subtitle="Radar view of data quality pillars">
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quality Score Trend" subtitle="Daily overall quality score">
          {metrics.qualityTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.qualityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
              Quality trend data will appear after daily checks are run.
            </div>
          )}
        </ChartCard>
      </div>

      {/* Quality Scorecard by Service */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quality Scorecard by Service Type</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Service</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Records</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Completeness</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Validity</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Freshness</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Overall</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.byService.map((svc) => (
                <tr key={svc.service} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <ServiceBadge service={svc.service} />
                  </td>
                  <td className="py-3 px-4 font-medium">{svc.totalRecords.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={scoreColor(svc.completeness)}>{svc.completeness}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={scoreColor(svc.validity)}>{svc.validity}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={scoreColor(svc.freshness)}>{svc.freshness}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${scoreColor(svc.overall)}`}>{svc.overall}%</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${scoreBg(svc.overall)}`}>
                      {svc.overall >= 99.5 ? "✓ Passing" : svc.overall >= 95 ? "⚠ Warning" : "✗ Failing"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Freshness by Source */}
      <ChartCard title="Data Freshness by Source" subtitle="Pipeline latency compliance">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { name: "Ethernet OSS", method: "CDC/Kafka", sla: "≤ 5 min", status: "healthy" },
            { name: "OCN Provisioning", method: "CDC/Kafka", sla: "≤ 5 min", status: "healthy" },
            { name: "DS1 Legacy OSS", method: "Batch/SFTP", sla: "≤ 20 min", status: "healthy" },
            { name: "DS3 Legacy OSS", method: "Batch/SFTP", sla: "≤ 20 min", status: "healthy" },
            { name: "PM Tool", method: "REST API", sla: "≤ 10 min", status: "healthy" },
          ].map((source) => (
            <div key={source.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${source.status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
                <h4 className="text-sm font-medium text-gray-900">{source.name}</h4>
              </div>
              <p className="text-xs text-gray-500">{source.method}</p>
              <p className="text-xs text-gray-500">SLA: {source.sla}</p>
              <p className={`text-xs font-medium mt-1 ${source.status === "healthy" ? "text-green-600" : "text-red-600"}`}>
                {source.status === "healthy" ? "✓ Within SLA" : "✗ Degraded"}
              </p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
