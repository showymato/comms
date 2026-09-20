"use client";

import { HealthTag } from "@/components/live/badges";
import { ChainBlock } from "@/components/live/status-panel";
import { overallHealth, useSystemStatus } from "@/hooks/use-system-status";
import { useAssets, useLive } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { HEALTH } from "@/lib/live/health";
import { cn } from "@/lib/utils";

/** The word for the whole system, computed from real request outcomes — "OPERATIONAL" only when everything is LIVE. */
export function overallLabel(h: ReturnType<typeof overallHealth>): string {
  return h === "LIVE" ? "SYSTEM OPERATIONAL" : h === "CONNECTING" ? "CONNECTING" : h === "NOT_CONFIGURED" ? "DEMO ENVIRONMENT" : `DATA ${HEALTH[h].label}`;
}

/** Status line used at the foot of the landing page: real health per dependency, not a static claim. */
export function SystemLine({ className }: { className?: string }) {
  const rows = useSystemStatus();
  const overall = overallHealth(rows);
  if (DATA_MODE === "demo") {
    return (
      <div role="status" className={cn("flex flex-col items-center gap-3", className)}>
        <span className="label !text-conditional">Demo environment</span>
        <span className="font-mono text-[10.5px] text-ink-4">Nothing here is read from a live source.</span>
      </div>
    );
  }
  return (
    <div role="status" className={cn("flex flex-col items-center gap-4", className)}>
      <HealthTag health={overall} className="!text-[11px]" />
      <span className={cn("label", HEALTH[overall].text)}>{overallLabel(overall)}</span>
      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 font-mono text-[11px] tracking-[0.1em] text-ink-2 uppercase">
        {rows
          .filter((r) => ["registry", "chain", "engine", "prices"].includes(r.id))
          .map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span aria-hidden className={cn("size-1.5 rounded-full", HEALTH[r.health].dot)} />
              {r.label}
              <span className={cn("text-[9.5px]", HEALTH[r.health].text)}>{HEALTH[r.health].label}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

/** Hero readout: only numbers that were actually fetched. Renders nothing until there is something real to say. */
export function LiveStrip({ className }: { className?: string }) {
  const { assets } = useAssets();
  const chain = useLive((s) => s.chain);
  const aapl = assets.find((a) => a.symbol === "AAPL")?.live?.price ?? null;
  if (DATA_MODE === "demo") return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-ink-2", className)} aria-label="Live infrastructure readout">
      <ChainBlock />
      <span>
        <span className="text-ink-3">STOCK TOKENS</span> <span className="tabular text-ink">{assets.length || "—"}</span>
      </span>
      {aapl ? (
        <span title="Raw underlying-equity mid from the Robinhood price API">
          <span className="text-ink-3">AAPL</span> <span className="tabular text-ink">${aapl.mid.toFixed(2)}</span>
        </span>
      ) : null}
      {chain.error && !chain.data ? <span className="text-conditional">CHAIN DATA DEGRADED</span> : null}
    </div>
  );
}
