"use client";

import { useEffect, useState } from "react";
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
  TrendingUp,
  Cpu,
  Wrench,
  HardHat,
  Sword,
  Library,
  Trophy,
  Menu,
  X,
  Plug,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof Menu };

const operationalItems: NavItem[] = [
  { href: "/", label: "Pipeline", icon: LayoutDashboard },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/bids", label: "Bids", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: HardHat },
  { href: "/activity", label: "Inbox", icon: Activity },
];

const accountItems: NavItem[] = [
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/plants", label: "Plants", icon: Factory },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/assets", label: "Assets", icon: Cpu },
  { href: "/contracts", label: "Contracts", icon: Wrench },
];

const libraryItems: NavItem[] = [
  { href: "/battle-cards", label: "Battle cards", icon: Sword },
  { href: "/proposals", label: "Proposals", icon: Library },
  { href: "/win-loss", label: "Win/Loss", icon: Trophy },
  { href: "/specs", label: "Specs", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        href={item.href}
        className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] font-medium transition-colors duration-150 ${
          active
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
        }`}
      >
        {/* Subtle active indicator bar — Honeywell-style left rule */}
        {active && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-white rounded-r" />
        )}
        <Icon
          size={15}
          strokeWidth={active ? 2.2 : 1.7}
          className={active ? "text-white" : "text-slate-500 group-hover:text-slate-800"}
        />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const NavGroup = ({ label, items }: { label?: string; items: NavItem[] }) => (
    <div>
      {label && (
        <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold px-2.5 mb-1.5 mt-3">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => <NavLink key={item.href} item={item} />)}
      </div>
    </div>
  );

  const sidebarBody = (
    <>
      <div className="px-4 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center text-white text-[11px] font-bold tracking-tight shadow-sm">
            O
          </div>
          <h1 className="text-sm font-bold text-slate-900 tracking-tight">
            Orchestrator
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <NavGroup items={operationalItems} />
        <NavGroup label="Accounts" items={accountItems} />
        <NavGroup label="Library" items={libraryItems} />
      </nav>

      <div className="px-2 py-2 border-t border-slate-200 space-y-0.5">
        <NavLink item={{ href: "/settings/integrations", label: "Integrations", icon: Plug }} />
        <NavLink item={{ href: "/usage", label: "Usage", icon: Gauge }} />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-lg bg-white border border-zinc-200 shadow-sm text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 flex items-center justify-center transition-all"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-[220px] bg-white border-r border-slate-200 flex flex-col shrink-0 h-screen transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
