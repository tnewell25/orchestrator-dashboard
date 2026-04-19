"use client";

import { type ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={[
        "bg-white border border-zinc-200 rounded-lg shadow-sm",
        padded ? "p-4" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const valueTone =
    tone === "positive" ? "text-emerald-700"
    : tone === "negative" ? "text-red-600"
    : tone === "warning" ? "text-amber-700"
    : "text-zinc-900";
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
        {label}
      </p>
      <p className={`text-lg font-semibold tabular-nums mt-0.5 ${valueTone}`}>
        {value}
      </p>
      {delta && (
        <p className="text-[11px] text-zinc-500 mt-0.5">{delta}</p>
      )}
    </div>
  );
}
