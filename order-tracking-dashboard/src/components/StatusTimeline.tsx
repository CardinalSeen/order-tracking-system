"use client";

import { StatusHistoryRecord } from "@/lib/types";
import { format } from "date-fns";

interface StatusTimelineProps {
  history: StatusHistoryRecord[];
}

export default function StatusTimeline({ history }: StatusTimelineProps) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-[12px] text-slate-400 py-4">No status history available.</p>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[9px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-blue-200 via-slate-200 to-slate-100" />
      <div className="space-y-4">
        {sorted.map((record, idx) => {
          const isLast = idx === sorted.length - 1;
          return (
            <div key={record.id} className="relative">
              <div className={`absolute -left-6 top-3 w-5 h-5 rounded-full flex items-center justify-center ${
                isLast
                  ? "bg-blue-600 ring-4 ring-blue-100"
                  : "bg-white border-2 border-slate-300"
              }`}>
                {isLast && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className={`ml-3 rounded-xl p-3.5 border transition-colors ${
                isLast ? "bg-blue-50/50 border-blue-100" : "bg-slate-50/50 border-slate-100"
              }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {record.previous_status && (
                      <>
                        <span className="text-[12px] text-slate-500 font-medium">{record.previous_status}</span>
                        <span className="text-slate-300">→</span>
                      </>
                    )}
                    <span className={`text-[12px] font-semibold ${isLast ? "text-blue-700" : "text-slate-700"}`}>
                      {record.new_status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {format(new Date(record.changed_at), "MMM d, yyyy · HH:mm")}
                  </span>
                </div>
                {record.changed_by && (
                  <p className="text-[10px] text-slate-400 mt-1">by {record.changed_by}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
