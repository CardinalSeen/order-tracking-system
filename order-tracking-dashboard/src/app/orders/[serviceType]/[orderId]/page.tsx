"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import ServiceBadge from "@/components/ServiceBadge";
import StatusTimeline from "@/components/StatusTimeline";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  UnifiedOrder, StatusHistoryRecord, SlaMetric, ServiceType,
  SERVICE_LABELS, STATUS_WORKFLOW, CanonicalStatus,
} from "@/lib/types";
import { ArrowLeft, MapPin, Calendar, Clock, AlertTriangle, CheckCircle, Info } from "lucide-react";
import Link from "next/link";

interface ServiceDetails { [key: string]: string | number | null | undefined; }

export default function OrderDetailPage() {
  const params = useParams();
  const serviceType = params.serviceType as ServiceType;
  const orderId = decodeURIComponent(params.orderId as string);

  const [order, setOrder] = useState<UnifiedOrder | null>(null);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [history, setHistory] = useState<StatusHistoryRecord[]>([]);
  const [slaMetric, setSlaMetric] = useState<SlaMetric | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrderDetail() {
      try {
        const { data: orderData } = await supabase.from("unified_orders_view").select("*").eq("order_id", orderId).eq("service_type", serviceType).single();
        if (orderData) setOrder(orderData as UnifiedOrder);

        const tableMap: Record<ServiceType, string> = { ethernet: "ethernet_orders", ocn: "ocn_orders", ds1: "ds1_orders", ds3: "ds3_orders", project_management: "project_orders" };
        const idField = serviceType === "project_management" ? "project_id" : "order_id";
        const { data: detailData } = await supabase.from(tableMap[serviceType]).select("*").eq(idField, orderId).single();
        if (detailData) setServiceDetails(detailData as ServiceDetails);

        const { data: historyData } = await supabase.from("order_status_history").select("*").eq("order_id", orderId).eq("service_type", serviceType).order("changed_at", { ascending: true });
        setHistory((historyData as StatusHistoryRecord[]) || []);

        const { data: slaData } = await supabase.from("sla_metrics").select("*").eq("order_id", orderId).eq("service_type", serviceType).single();
        if (slaData) setSlaMetric(slaData as SlaMetric);
      } catch (err) {
        console.error("Error fetching order detail:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrderDetail();
  }, [orderId, serviceType]);

  if (loading) return <LoadingSpinner />;

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500 text-[14px]">Order not found.</p>
        <Link href="/orders" className="text-blue-600 hover:text-blue-700 text-[12px] mt-2 inline-block font-medium">← Back to Orders</Link>
      </div>
    );
  }

  const workflow = STATUS_WORKFLOW[serviceType] || [];
  const currentStepIndex = workflow.findIndex((s) => s.toLowerCase() === (order.raw_status || "").toLowerCase());

  return (
    <div>
      {/* Breadcrumb */}
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 font-medium mb-5 transition-colors">
        <ArrowLeft size={13} /> Back to Orders
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[20px] font-bold text-slate-900 font-mono tracking-tight">{orderId}</h1>
              <ServiceBadge service={serviceType} />
              <StatusBadge status={order.canonical_status} />
            </div>
            <p className="text-[12px] text-slate-500">
              {SERVICE_LABELS[serviceType]} · {order.order_type || "Unknown type"} · Customer <span className="font-semibold text-slate-700">{order.customer_id}</span>
            </p>
          </div>
          {slaMetric?.breach_risk && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200/60 rounded-xl">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-[12px] font-semibold text-red-700">SLA Breach Risk</span>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-5">Workflow Progress</p>
        <div className="flex items-center">
          {workflow.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isCancelled = order.canonical_status === "CANCELLED";
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                    isCancelled ? "bg-slate-100 text-slate-400"
                    : isCompleted ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                    : isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100 shadow-sm shadow-blue-200"
                    : "bg-slate-100 text-slate-400"
                  }`}>
                    {isCompleted ? <CheckCircle size={14} /> : idx + 1}
                  </div>
                  <span className={`text-[10px] mt-2 text-center font-medium leading-tight max-w-[80px] ${isCurrent ? "text-blue-600" : "text-slate-400"}`}>
                    {step}
                  </span>
                </div>
                {idx < workflow.length - 1 && (
                  <div className={`h-[2px] flex-1 mx-1 rounded-full ${isCompleted ? "bg-emerald-400" : "bg-slate-150"}`} style={{ backgroundColor: isCompleted ? "#34d399" : "#e2e8f0" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Dates */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-slate-400" />
            <h2 className="text-[13px] font-semibold text-slate-900">Key Dates</h2>
          </div>
          <dl className="space-y-3">
            {[
              { label: "Created", value: order.created_at },
              { label: "Requested Due", value: order.requested_due_date },
              { label: "Committed Due", value: order.committed_due_date },
              { label: "Completed", value: order.actual_completion_date },
              { label: "Last Updated", value: order.updated_at },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-[11px] text-slate-400 font-medium">{label}</dt>
                <dd className="text-[12px] font-medium text-slate-700">{value ? new Date(value).toLocaleDateString() : "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Locations */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-slate-400" />
            <h2 className="text-[13px] font-semibold text-slate-900">Locations</h2>
          </div>
          <dl className="space-y-4">
            <div>
              <dt className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">A-End (CLLI)</dt>
              <dd className="text-[14px] font-bold font-mono text-slate-800 mt-1">{order.a_location_clli || "—"}</dd>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <dt className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Z-End (CLLI)</dt>
              <dd className="text-[14px] font-bold font-mono text-slate-800 mt-1">{order.z_location_clli || "—"}</dd>
            </div>
          </dl>
        </div>

        {/* SLA */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={15} className="text-slate-400" />
            <h2 className="text-[13px] font-semibold text-slate-900">SLA Metrics</h2>
          </div>
          {slaMetric ? (
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-[11px] text-slate-400 font-medium">Days in Status</dt>
                <dd className="text-[13px] font-bold text-slate-800">{slaMetric.days_in_current_status ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[11px] text-slate-400 font-medium">Cycle Time</dt>
                <dd className="text-[13px] font-bold text-slate-800">{slaMetric.cycle_time != null ? `${slaMetric.cycle_time}d` : "—"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[11px] text-slate-400 font-medium">SLA Variance</dt>
                <dd className={`text-[13px] font-bold ${slaMetric.sla_variance_days != null ? (slaMetric.sla_variance_days > 0 ? "text-red-600" : "text-emerald-600") : "text-slate-800"}`}>
                  {slaMetric.sla_variance_days != null ? `${slaMetric.sla_variance_days > 0 ? "+" : ""}${slaMetric.sla_variance_days}d` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <dt className="text-[11px] text-slate-400 font-medium">Risk Status</dt>
                <dd>
                  {slaMetric.breach_risk ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">
                      <AlertTriangle size={10} /> At Risk
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle size={10} /> On Track
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-[12px] text-slate-400">No SLA data available.</p>
          )}
        </div>
      </div>

      {/* Service Details */}
      {serviceDetails && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Info size={15} className="text-slate-400" />
            <h2 className="text-[13px] font-semibold text-slate-900">{SERVICE_LABELS[serviceType]} Attributes</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
            {Object.entries(serviceDetails)
              .filter(([key]) => !["id", "created_at", "updated_at", "customer_id", "order_id", "project_id", "order_status", "project_status"].includes(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{key.replace(/_/g, " ")}</dt>
                  <dd className="text-[13px] font-semibold text-slate-800 mt-0.5">{value != null ? String(value) : "—"}</dd>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-[13px] font-semibold text-slate-900 mb-5">Status History</h2>
        <StatusTimeline history={history} />
      </div>
    </div>
  );
}
