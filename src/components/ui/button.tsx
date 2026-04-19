"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "xs" | "sm" | "md";

// Deep navy primary, restrained edges, no soft shadows — the
// Bosch/Honeywell aesthetic: enterprise gravitas over consumer SaaS.
const VARIANT: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-black border border-transparent",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:bg-slate-50",
  ghost:
    "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent",
  danger:
    "bg-red-700 text-white hover:bg-red-800 border border-transparent",
  soft:
    "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-transparent",
};

// Slightly squarer corners. Industrial dials/control panels read flatter.
const SIZE: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1 rounded",
  sm: "h-8 px-3 text-xs gap-1.5 rounded",
  md: "h-9 px-4 text-[13px] gap-2 rounded",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "sm", loading, disabled, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "focus-visible:outline-none",
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
});
