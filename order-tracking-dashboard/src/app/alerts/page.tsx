"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/Card";
import ServiceBadge from "@/components/ServiceBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { Alert, ServiceType } from "@/lib/types";
import { Bell, CheckCircle, AlertTriangle, AlertOctagon, Info, Shield } from "lucide-react";
import Link from "next/link";

const severityConfig: Record<string, { bg: string; border: string; icon: string; dot: string }> = {
  critical: { bg: "bg-red-50/80", border: "border-l-red-500", icon: "text-red-600", dot: "bg-red-500" },
  high: { bg: "bg-orange-50/60", border: "border-l-orange-500", icon: "text-orange-600", dot: "bg-orange-500" },
  medium: { bg: "bg-amber-50/60", border: "border-l-amber-400", icon: "text-amber-600", dot: "bg-amber-400" },
  low: { bg: "bg-blue-50/40", border: "border-l-blue-400", icon: "text-blue-500", dot: "bg-blue-400" },
};

const alertTypeLabels: Record<string, string> = {
  sla_breach_risk: "SLA Breach Risk",
  stuck_order: "Stuck Order",
  data_freshness_degradation: "Data Freshness",
  pipeline_failure: "Pipeline Failure",
  anomalous_volume: "Anomalous Volume",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchAlerts() {
      try {
        let query = supabase.from("alerts").select("*").order("created_at", { ascending: false });
        if (!showAcknowledged) query = query.is("acknowledged_at", null);
        const { data } = await query;
        setAlerts((data as Alert[]) || []);
      } catch (err) {
        console.error("Error fetching alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, [showAcknowledged]);

  const handleAcknowledge = async (alertId: string) => {
    const { error } = await supabase.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: "dashboard_user" }).eq("id", alertId);
    if (!error) {
      setAlerts((prev) => showAcknowledged
        ? prev.map((a) => a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString(), acknowledged_by: "dashboard_user" } : a)
        : prev.filter((a) => a.id !== alertId)
      );
    }
  };

  const handleAcknowledgeAll = async () => {
    const unacked = filteredAlerts.filter((a) => !a.acknowledged_at);
    if (unacked.length === 0) return;
    const ids = unacked.map((a) => a.id);
    const { error } = await supabase.from("alerts").update({ acknowledged_at: new Date().toISOString(), acknowledged_by: "dashboard_user" }).in("id", ids);
    if (!error) {
      if (showAcknowledged) {
        setAlerts((prev) => prev.map((a) => ids.includes(a.id) ? { ...a, acknowledged_at: new Date().toISOString(), acknowledged_by: "dashboard_user" } : a));
      } else {
        setAlerts((prev) => prev.filter((a) => !ids.includes(a.id)));
      }
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (typeFilter !== "all" && a.alert_type !== typeFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.acknowledged_at).length;
  const highCount = alerts.filter((a) => a.severity === "high" && !a.acknowledged_at).length;
  const totalUnacked = alerts.filter((a) => !a.acknowledged_at).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Alerts</h1>
          <p className="text-[13px] text-slate-500 mt-1">SLA breaches, stuck orders, and system health</p>
        </div>
        {totalUnacked > 0 && (
          <button onClick={handleAcknowledgeAll} className="px-4 py-2 text-[12px] font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
            Acknowledge All ({totalUnacked})
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card title="Active Alerts" value={totalUnacked} subtitle="Unacknowledged" icon={<Bell size={20} />} accentColor="bg-slate-100 text-slate-600" />
        <Card title="Critical" value={criticalCount} subtitle="Immediate action" icon={<AlertOctagon size={20} />} accentColor="bg-red-50 text-red-600" />
        <Card title="High" value={highCount} subtitle="Needs attention" icon={<AlertTriangle size={20} />} accentColor="bg-orange-50 text-orange-600" />
        <Card title="Total" value={alerts.length} subtitle={showAcknowledged ? "All time" : "Active"} icon={<Shield size={20} />} accentColor="bg-blue-50 text-blue-600" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white">
            <option value="all">All Types</option>
            <option value="sla_breach_risk">SLA Breach</option>
            <option value="stuck_order">Stuck Order</option>
            <option value="data_freshness_degradation">Data Freshness</option>
            <option value="pipeline_failure">Pipeline Failure</option>
          </select>
          <label className="flex items-center gap-2 text-[12px] text-slate-500 font-medium ml-auto cursor-pointer">
            <input type="checkbox" checked={showAcknowledged} onChange={(e) => setShowAcknowledged(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5" />
            Show acknowledged
          </label>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState icon={<CheckCircle size={40} />} title="No active alerts" description="Alerts appear when orders breach SLA thresholds or systems degrade." />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.low;
            return (
              <div key={alert.id} className={`rounded-2xl border border-slate-200/60 border-l-[3px] ${config.border} ${config.bg} p-4 transition-all ${alert.acknowledged_at ? "opacity-50" : "hover:shadow-sm"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{alert.severity}</span>
                      <span className="text-[10px] text-slate-400">·</span>
                      <span className="text-[11px] font-medium text-slate-500">{alertTypeLabels[alert.alert_type] || alert.alert_type}</span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-800 leading-relaxed">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2.5">
                      {alert.order_id && alert.service_type && (
                        <Link href={`/orders/${alert.service_type}/${alert.order_id}`} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
                          {alert.order_id}
                        </Link>
                      )}
                      {alert.service_type && <ServiceBadge service={alert.service_type} />}
                      <span className="text-[10px] text-slate-400">{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {!alert.acknowledged_at && (
                    <button onClick={() => handleAcknowledge(alert.id)} className="flex-shrink-0 px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all">
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
