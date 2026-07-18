"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/components/Card";
import ChartCard from "@/components/ChartCard";
import PriorityBadge from "@/components/PriorityBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { ProjectRollup } from "@/lib/types";
import { FolderKanban, Users, CheckCircle, AlertCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  Initiated: "#3b82f6",
  Planning: "#8b5cf6",
  "In Progress": "#f59e0b",
  UAT: "#f97316",
  Complete: "#10b981",
  "On Hold": "#6b7280",
  Cancelled: "#ef4444",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data } = await supabase
          .from("project_rollup_view")
          .select("*")
          .order("project_id", { ascending: true });

        setProjects((data as ProjectRollup[]) || []);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  if (loading) return <LoadingSpinner />;

  const filteredProjects = statusFilter === "all"
    ? projects
    : projects.filter((p) => p.project_status === statusFilter);

  const activeProjects = projects.filter(
    (p) => !["Complete", "Cancelled"].includes(p.project_status)
  ).length;
  const completedProjects = projects.filter((p) => p.project_status === "Complete").length;
  const totalLinkedOrders = projects.reduce((sum, p) => sum + p.linked_orders_count, 0);

  // Status distribution for pie chart
  const statusDist = Object.entries(
    projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.project_status] = (acc[p.project_status] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Multi-service project management with linked order tracking
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-[12px] font-medium text-slate-700 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="Initiated">Initiated</option>
          <option value="Planning">Planning</option>
          <option value="In Progress">In Progress</option>
          <option value="UAT">UAT</option>
          <option value="Complete">Complete</option>
          <option value="On Hold">On Hold</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="No projects found."
          description="Add project orders to see them here."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card title="Total Projects" value={projects.length} icon={<FolderKanban size={24} />} />
            <Card title="Active" value={activeProjects} subtitle="In progress" icon={<AlertCircle size={24} />} />
            <Card title="Completed" value={completedProjects} icon={<CheckCircle size={24} />} />
            <Card title="Linked Orders" value={totalLinkedOrders} subtitle="Across all projects" icon={<Users size={24} />} />
          </div>

          {/* Project Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <ChartCard title="Project Status Distribution" className="lg:col-span-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                    {statusDist.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Priority breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects by Priority</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["Critical", "High", "Medium", "Low"].map((priority) => {
                  const count = projects.filter((p) => p.priority === priority).length;
                  return (
                    <div key={priority} className="text-center p-4 rounded-lg bg-gray-50">
                      <PriorityBadge priority={priority} />
                      <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Project Cards */}
          <div className="grid gap-6">
            {filteredProjects.map((project) => {
              const progress =
                project.total_sites > 0
                  ? Math.round((project.sites_completed / project.total_sites) * 100)
                  : 0;

              const orderProgress =
                project.linked_orders_count > 0
                  ? Math.round((project.completed_orders / project.linked_orders_count) * 100)
                  : 0;

              return (
                <div key={project.project_id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {project.project_name || project.project_id}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {project.project_id} • {project.project_type || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={project.priority} />
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {project.project_status}
                      </span>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Site Progress</span>
                        <span className="font-medium">
                          {project.sites_completed}/{project.total_sites} ({progress}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Order Completion</span>
                        <span className="font-medium">
                          {project.completed_orders}/{project.linked_orders_count} ({orderProgress}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${orderProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Linked orders breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Linked Orders</p>
                      <p className="text-lg font-bold text-gray-900">{project.linked_orders_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-lg font-bold text-green-600">{project.completed_orders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">In Progress</p>
                      <p className="text-lg font-bold text-yellow-600">{project.in_progress_orders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cancelled</p>
                      <p className="text-lg font-bold text-red-600">{project.cancelled_orders}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    <span>PM: {project.project_manager_id || "Unassigned"}</span>
                    <span>Customer: {project.customer_id}</span>
                    {project.committed_due_date && (
                      <span>Due: {new Date(project.committed_due_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
