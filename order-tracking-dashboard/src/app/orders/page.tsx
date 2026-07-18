"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import ServiceBadge from "@/components/ServiceBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { UnifiedOrder, CanonicalStatus, ServiceType } from "@/lib/types";
import { Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<UnifiedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("unified_orders_view")
        .select("*", { count: "exact" })
        .order(sortField, { ascending: sortDir === "asc" })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (serviceFilter !== "all") query = query.eq("service_type", serviceFilter);
      if (statusFilter !== "all") query = query.eq("canonical_status", statusFilter);
      if (orderTypeFilter !== "all") query = query.eq("order_type", orderTypeFilter);

      const { data } = await query;
      setOrders((data as UnifiedOrder[]) || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [serviceFilter, statusFilter, orderTypeFilter, sortField, sortDir, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = orders.filter(
    (o) =>
      o.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.a_location_clli || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.z_location_clli || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-0.5">↕</span>;
    return <span className="text-blue-500 ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const exportCSV = () => {
    const headers = ["Order ID", "Service", "Type", "Status", "Customer", "A Location", "Z Location", "Due Date", "Created"];
    const rows = filteredOrders.map((o) => [o.order_id, o.service_type, o.order_type || "", o.canonical_status, o.customer_id, o.a_location_clli || "", o.z_location_clli || "", o.committed_due_date || "", o.created_at]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Orders</h1>
          <p className="text-[13px] text-slate-500 mt-1">Unified search across all service types</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchOrders} className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all">
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, or CLLI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <select value={serviceFilter} onChange={(e) => { setServiceFilter(e.target.value); setPage(0); }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white hover:border-slate-300 transition-colors">
            <option value="all">All Services</option>
            <option value="ethernet">Ethernet</option>
            <option value="ocn">OCN</option>
            <option value="ds1">DS1</option>
            <option value="ds3">DS3</option>
            <option value="project_management">Project Mgmt</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white hover:border-slate-300 transition-colors">
            <option value="all">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="DESIGN">Design</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="TESTING">Testing</option>
            <option value="COMPLETE">Complete</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select value={orderTypeFilter} onChange={(e) => { setOrderTypeFilter(e.target.value); setPage(0); }} className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white hover:border-slate-300 transition-colors">
            <option value="all">All Types</option>
            <option value="New">New</option>
            <option value="Change">Change</option>
            <option value="Disconnect">Disconnect</option>
            <option value="Upgrade">Upgrade</option>
          </select>
        </div>
      </div>

      {/* Results bar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-slate-500 font-medium">
          {filteredOrders.length} result{filteredOrders.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-slate-500 px-2 font-medium">Page {page + 1}</span>
          <button onClick={() => setPage(page + 1)} disabled={orders.length < pageSize} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center">
            <Filter size={28} className="mx-auto mb-3 text-slate-300" />
            <p className="text-[13px] text-slate-500">No orders match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("order_id")}>
                    Order ID <SortIcon field="order_id" />
                  </th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">A-End</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Z-End</th>
                  <th className="text-left py-3 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("committed_due_date")}>
                    Due <SortIcon field="committed_due_date" />
                  </th>
                  <th className="text-left py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort("created_at")}>
                    Created <SortIcon field="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id} className={`hover:bg-blue-50/30 transition-colors ${idx !== filteredOrders.length - 1 ? "border-b border-slate-50" : ""}`}>
                    <td className="py-3.5 px-5">
                      <Link href={`/orders/${order.service_type}/${order.order_id}`} className="font-mono text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                        {order.order_id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-3"><ServiceBadge service={order.service_type} /></td>
                    <td className="py-3.5 px-3 text-slate-600 font-medium">{order.order_type || "—"}</td>
                    <td className="py-3.5 px-3"><StatusBadge status={order.canonical_status} /></td>
                    <td className="py-3.5 px-3 text-slate-700 font-medium">{order.customer_id}</td>
                    <td className="py-3.5 px-3 font-mono text-[10px] text-slate-500">{order.a_location_clli || "—"}</td>
                    <td className="py-3.5 px-3 font-mono text-[10px] text-slate-500">{order.z_location_clli || "—"}</td>
                    <td className="py-3.5 px-3 text-slate-500">{order.committed_due_date ? new Date(order.committed_due_date).toLocaleDateString() : "—"}</td>
                    <td className="py-3.5 px-5 text-slate-400">{new Date(order.created_at).toLocaleDateString()}</td>
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
