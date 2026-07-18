import { ServiceType, SERVICE_LABELS } from "@/lib/types";

const serviceConfig: Record<ServiceType, { bg: string; text: string }> = {
  ethernet: { bg: "bg-indigo-50 border-indigo-200/50", text: "text-indigo-700" },
  ocn: { bg: "bg-teal-50 border-teal-200/50", text: "text-teal-700" },
  ds1: { bg: "bg-amber-50 border-amber-200/50", text: "text-amber-700" },
  ds3: { bg: "bg-rose-50 border-rose-200/50", text: "text-rose-700" },
  project_management: { bg: "bg-violet-50 border-violet-200/50", text: "text-violet-700" },
};

export default function ServiceBadge({ service }: { service: ServiceType }) {
  const config = serviceConfig[service] || { bg: "bg-slate-50 border-slate-200/50", text: "text-slate-600" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${config.bg} ${config.text}`}>
      {SERVICE_LABELS[service] || service}
    </span>
  );
}
