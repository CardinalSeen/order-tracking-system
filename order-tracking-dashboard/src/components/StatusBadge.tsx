import { CanonicalStatus } from "@/lib/types";

const statusConfig: Record<CanonicalStatus, { bg: string; text: string; dot: string }> = {
  RECEIVED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  DESIGN: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  IN_PROGRESS: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  TESTING: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  COMPLETE: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  ON_HOLD: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export default function StatusBadge({ status }: { status: CanonicalStatus }) {
  const config = statusConfig[status] || { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status.replace("_", " ")}
    </span>
  );
}
