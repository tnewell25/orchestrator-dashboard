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
} from "lucide-react";

const navItems = [
  { href: "/", label: "Pipeline", icon: LayoutDashboard },
  { href: "/forecast", label: "Forecast", icon: TrendingUp },
  { href: "/bids", label: "Bids", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: HardHat },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/plants", label: "Plants", icon: Factory },
  { href: "/assets", label: "Assets", icon: Cpu },
  { href: "/contracts", label: "Contracts", icon: Wrench },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
];

const libraryItems = [
  { href: "/battle-cards", label: "Battle cards", icon: Sword },
  { href: "/proposals", label: "Proposals", icon: Library },
  { href: "/win-loss", label: "Win/Loss", icon: Trophy },
  { href: "/specs", label: "Specs", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavLink = ({ href, label, icon: Icon, dim }: { href: string; label: string; icon: typeof Menu; dim?: boolean }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
          active
            ? "bg-slate-800 text-white"
            : dim
              ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
        }`}
      >
        <Icon size={15} strokeWidth={1.8} />
        {label}
      </Link>
    );
  };

  const sidebarBody = (
    <>
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-white tracking-tight">
          Orchestrator
        </h1>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        <div className="pt-3 mt-2 border-t border-slate-800/60">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-2.5 mb-1">
            Library
          </p>
          {libraryItems.map((item) => (
            <NavLink key={item.href} {...item} dim />
          ))}
        </div>
      </nav>

      <div className="px-2 py-2 border-t border-slate-800">
        <NavLink href="/usage" label="Usage" icon={Gauge} dim />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded bg-slate-900 text-white shadow-md flex items-center justify-center"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile (slide in), static on desktop */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 w-[220px] bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarBody}
      </aside>
    </>
  );
}
