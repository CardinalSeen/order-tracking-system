import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 border-dashed p-16 text-center">
      <div className="mx-auto mb-4 text-slate-300 flex justify-center">{icon}</div>
      <p className="text-[14px] font-medium text-slate-600">{title}</p>
      {description && <p className="text-[12px] text-slate-400 mt-1.5 max-w-sm mx-auto">{description}</p>}
    </div>
  );
}
