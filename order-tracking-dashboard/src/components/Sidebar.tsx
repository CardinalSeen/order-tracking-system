"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Activity,
  FolderKanban,
  Bell,
  BarChart3,
  ShieldCheck,
  Zap,
} from "lucide-react";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/orders", label: "Orders", icon: Search },
    ],
  },
  {
    label: "Performance",
    items: [
      { href: "/sla", label: "SLA Metrics", icon: Activity },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/data-quality", label: "Data Quality", icon: ShieldCheck },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-[#0f172a] text-white min-h-screen flex flex-col border-r border-slate-800 sticky top-0 h-screen">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight">Project Patatas</h1>
            <p className="text-[11px] text-slate-400 font-medium">Order Tracking System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                    }`}
                  >
                    <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                    {item.label}
                    {item.label === "Alerts" && (
                      <span className="ml-auto w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center">
                        6
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300">
            MS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-slate-300 truncate">Marc Sandrino</p>
            <p className="text-[10px] text-slate-500">Operations Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
