"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Inbox,
  HardHat,
} from "lucide-react";

const items = [
  { href: "/", label: "Pipeline", icon: LayoutDashboard, match: (p: string) => p === "/" },
  { href: "/forecast", label: "Forecast", icon: TrendingUp, match: (p: string) => p.startsWith("/forecast") },
  { href: "/jobs", label: "Jobs", icon: HardHat, match: (p: string) => p.startsWith("/jobs") },
  { href: "/activity", label: "Inbox", icon: Inbox, match: (p: string) => p.startsWith("/activity") },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-zinc-200 safe-bottom">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-700"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                <span className="text-[10px] font-medium">{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
