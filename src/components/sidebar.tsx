"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Activity,
  Gauge,
  Building2,
  FileText,
  Factory,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Pipeline", icon: LayoutDashboard },
  { href: "/bids", label: "Bids", icon: FileText },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/plants", label: "Plants", icon: Factory },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/specs", label: "Specs", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0">
      <div className="px-4 py-3 border-b border-slate-800">
        <h1 className="text-sm font-semibold text-white tracking-tight">
          Orchestrator
        </h1>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-2 border-t border-slate-800">
        <Link
          href="/usage"
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
            pathname === "/usage"
              ? "bg-slate-800 text-white"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
          }`}
        >
          <Gauge size={15} strokeWidth={1.8} />
          Usage
        </Link>
      </div>
    </aside>
  );
}
