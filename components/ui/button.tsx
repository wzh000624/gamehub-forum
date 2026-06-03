import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "neon-button text-white",
        variant === "secondary" &&
          "border border-slate-700 bg-slate-900/70 text-slate-100 hover:bg-slate-800",
        variant === "ghost" && "text-slate-300 hover:bg-white/[0.08] hover:text-white",
        variant === "danger" &&
          "border border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/16",
        className
      )}
      {...props}
    />
  );
}
