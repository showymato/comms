"use client";

import { RollingText } from "@/components/live/rolling-text";
import { useCountUp } from "@/hooks/use-motion";
import { cn } from "@/lib/utils";

export type MetricState = "loading" | "ok" | "unknown";

function Count({ value }: { value: number }) {
  const v = useCountUp(value, { duration: 1, fromZero: true });
  return <>{v.toLocaleString("en-US")}</>;
}

/**
 * A single measured value with its source. If the value could not be read it says UNKNOWN — a metric never falls back to a
 * plausible number.
 */
export function Metric({
  label,
  value,
  state,
  source,
  hint,
  size = "lg",
  className,
}: {
  label: string;
  /** number → counted; string → rolled per character */
  value: number | string | null;
  state: MetricState;
  source: string;
  hint?: string;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const big = size === "xl" ? "text-[clamp(3rem,7vw,6.5rem)]" : size === "lg" ? "text-[clamp(2rem,3.6vw,3.25rem)]" : "text-[clamp(1.5rem,2.4vw,2rem)]";
  const unknown = state === "unknown" || (state === "ok" && value === null);
  return (
    <div className={cn("min-w-0", className)}>
      <div className="label">{label}</div>
      <div className={cn("tabular mt-2 leading-none font-medium tracking-[-0.045em] text-ink", big, unknown && "text-ink-3")} aria-live="polite">
        {state === "loading" ? (
          <span aria-label="loading" className="inline-block h-[0.8em] w-[3ch] animate-pulse rounded-sm bg-ink/8 align-middle" />
        ) : unknown ? (
          <span className="text-[0.5em] tracking-[0.02em]">UNKNOWN</span>
        ) : typeof value === "number" ? (
          <Count value={value} />
        ) : (
          <RollingText value={String(value)} />
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
        <span>{source}</span>
        {hint ? (
          <>
            <span aria-hidden className="text-ink-4">/</span>
            <span>{hint}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
