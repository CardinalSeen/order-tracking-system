import { ReactNode } from "react";

interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  accentColor?: string;
}

export default function Card({ title, value, subtitle, icon, accentColor }: CardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-300/80">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="text-[28px] font-bold text-slate-900 mt-1.5 tracking-tight leading-none">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-2 font-medium">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            accentColor || "bg-slate-100 text-slate-500"
          }`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
