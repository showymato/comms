"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** Segmented control with a sliding indicator. Arrow-key navigation via native radio semantics. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; count?: number }[];
  label: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const layoutId = useId();
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex rounded-md border border-line bg-base-1 p-0.5", className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => {
              const i = options.findIndex((x) => x.id === value);
              if (e.key === "ArrowRight") onChange(options[(i + 1) % options.length].id);
              if (e.key === "ArrowLeft") onChange(options[(i - 1 + options.length) % options.length].id);
            }}
            className={cn(
              "relative rounded-[5px] font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active ? (
              <motion.span layoutId={layoutId} className="absolute inset-0 rounded-[5px] bg-ink/8 hairline" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            ) : null}
            <span className="relative">
              {o.label}
              {o.count !== undefined ? <span className="ml-1.5 font-mono text-[10px] text-ink-3">{o.count}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
