"use client";

import { Popover } from "@/components/ui/popover";
import { DATA_MODE, FRESHNESS, freshnessOf } from "@/lib/data/config";
import { formatAgo, formatTimestamp } from "@/lib/format";
import { HEALTH, SOURCE_INFO, isDemoSource } from "@/lib/live/health";
import { cn } from "@/lib/utils";
import { useNowMs } from "@/hooks/use-live";
import type { EvidenceSource, ProviderHealth } from "@/types";

/** Health word + dot. LIVE is only ever passed in when data is fresh — see sliceHealth(). */
export function HealthTag({ health, className, dotOnly }: { health: ProviderHealth; className?: string; dotOnly?: boolean }) {
  const h = HEALTH[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] whitespace-nowrap", h.text, className)}>
      <span aria-hidden className={cn("relative size-1.5 rounded-full", h.dot)}>
        {health === "LIVE" ? <span className="absolute inset-0 animate-pulse-ring rounded-full" /> : null}
      </span>
      {dotOnly ? <span className="sr-only">{h.label}</span> : h.label}
    </span>
  );
}

/** LIVE DATA / DEMO ENVIRONMENT / HYBRID — which data mode this build runs in. Demo is deliberately loud. */
export function ModeBadge({ className }: { className?: string }) {
  if (DATA_MODE === "live") {
    return (
      <span className={cn("inline-flex h-5 items-center gap-1.5 rounded-xs border border-eligible/30 bg-eligible/8 px-1.5 font-mono text-[10px] tracking-[0.08em] text-eligible", className)} title="Values are read from Robinhood and Robinhood Chain. Anything that cannot be verified is UNKNOWN.">
        <span aria-hidden className="size-1 rounded-full bg-eligible" />
        LIVE DATA
      </span>
    );
  }
  const hybrid = DATA_MODE === "hybrid";
  return (
    <span
      className={cn("inline-flex h-5 items-center rounded-xs border border-conditional/40 bg-conditional/12 px-1.5 font-mono text-[10px] font-medium tracking-[0.08em] text-conditional", className)}
      title={hybrid ? "Real market data; checks with no live source are filled with values marked DEMO" : "Simulated demo data — nothing is read from a live source"}
    >
      {hybrid ? "HYBRID · DEMO GAPS" : "DEMO ENVIRONMENT"}
    </span>
  );
}

/** Tiny per-value source label. Clicking explains where the value came from, when, and what it means. */
export function SourceBadge({ source, at, note, className }: { source: EvidenceSource; at?: string | number | null; note?: string; className?: string }) {
  const info = SOURCE_INFO[source];
  const demo = isDemoSource(source);
  const unknown = source === "NONE";
  return (
    <Popover
      label={`Source: ${info.label}`}
      align="left"
      triggerClassName={cn(
        "inline-flex h-[18px] items-center gap-1 rounded-xs border px-1.5 font-mono text-[9.5px] tracking-[0.08em] whitespace-nowrap transition-colors",
        demo ? "border-conditional/30 text-conditional hover:bg-conditional/10" : unknown ? "border-line text-ink-3 hover:text-ink" : "border-cyan/25 text-cyan hover:bg-cyan/10",
        className,
      )}
      trigger={
        <>
          <span aria-hidden className="size-1 rounded-full bg-current" />
          {info.label}
        </>
      }
      panelClassName="w-72 p-3"
    >
      {() => (
        <div className="space-y-2 text-[12.5px] leading-relaxed">
          <div className="label !text-ink-2">{info.label}</div>
          <div className="font-mono text-[11px] text-ink-3">{info.kind}</div>
          <p className="text-ink-2">{info.means}</p>
          {at ? (
            <p className="font-mono text-[11px] text-ink-3">
              Updated {formatTimestamp(typeof at === "number" ? new Date(at).toISOString() : at)} UTC
            </p>
          ) : null}
          {note ? <p className="border-t border-line pt-2 text-[12px] text-ink-3">{note}</p> : null}
        </div>
      )}
    </Popover>
  );
}

/** "3s ago" with a freshness colour: fresh → cyan, aging → amber, stale → red, unknown → grey. Colour is never alone: the age is printed. */
export function FreshnessTag({ at, kind = "price", className }: { at: string | number | null | undefined; kind?: keyof typeof FRESHNESS; className?: string }) {
  const now = useNowMs(1000);
  if (at === null || at === undefined || now === 0) return <span className={cn("font-mono text-[10.5px] text-ink-4", className)}>—</span>;
  const ms = typeof at === "number" ? at : Date.parse(at);
  const age = Math.max(0, (now - ms) / 1000);
  const f = freshnessOf(age, FRESHNESS[kind]);
  const tone = f === "FRESH" ? "text-cyan" : f === "AGING" ? "text-conditional" : f === "STALE" ? "text-ineligible" : "text-ink-4";
  return (
    <span className={cn("tabular font-mono text-[10.5px]", tone, className)} title={`${f} · ${new Date(ms).toISOString()}`}>
      {f === "STALE" ? "STALE · " : ""}
      {formatAgo(age)}
    </span>
  );
}
