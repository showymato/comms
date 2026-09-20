"use client";

import { RefreshCw } from "lucide-react";
import { HealthTag } from "@/components/live/badges";
import { RollingText } from "@/components/live/rolling-text";
import { overallHealth, useSystemStatus } from "@/hooks/use-system-status";
import { useLive, useNowMs } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { formatAgo } from "@/lib/format";
import { HEALTH } from "@/lib/live/health";
import { cn } from "@/lib/utils";

/** COMMS SYSTEM STATUS — real health per dependency, with real request latency where a request was made. */
export function SystemStatusPanel({ className, compact = false }: { className?: string; compact?: boolean }) {
  const rows = useSystemStatus();
  const overall = overallHealth(rows);
  return (
    <div className={cn("text-[12.5px]", className)}>
      <div className="flex items-center justify-between pb-2">
        <span className="label !text-ink-2">System status</span>
        <HealthTag health={overall} />
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-2">{r.label}</span>
              <span className="flex items-center gap-3">
                {!compact && r.latencyMs !== null ? <span className="tabular font-mono text-[10.5px] text-ink-3">{r.latencyMs} ms</span> : null}
                <HealthTag health={r.health} />
              </span>
            </div>
            {r.error && r.health !== "NOT_CONFIGURED" ? (
              <div className="mt-1.5 flex items-start justify-between gap-3 rounded-md border border-conditional/20 bg-conditional/6 px-2.5 py-2">
                <p className="text-[11.5px] leading-relaxed text-ink-2">
                  <span className={cn("font-mono", HEALTH[r.health].text)}>{r.health === "OFFLINE" ? "Unable to retrieve current data." : "Latest refresh failed."}</span>{" "}
                  <span className="text-ink-3">{r.error}</span>
                  {r.ageSec !== null ? <span className="block font-mono text-[10.5px] text-ink-4">Last successful update {formatAgo(r.ageSec)}</span> : null}
                </p>
                {r.retry ? (
                  <button type="button" onClick={r.retry} className="inline-flex shrink-0 items-center gap-1 font-mono text-[10.5px] text-cyan hover:text-ink">
                    <RefreshCw size={11} /> Retry
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** RH CHAIN · BLOCK n. Retains the last valid block if the RPC fails; never shows an invented number. */
export function ChainBlock({ className }: { className?: string }) {
  const chain = useLive((s) => s.chain);
  const now = useNowMs(1000);
  if (DATA_MODE === "demo") return null;
  const block = chain.data?.block;
  const age = chain.fetchedAt === null || now === 0 ? null : (now - chain.fetchedAt) / 1000;
  const degraded = chain.error !== null;
  const fresh = age !== null && age <= 45 && !degraded;
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[11px] text-ink-2", className)} title={degraded ? `Chain data degraded: ${chain.error}` : "Latest Robinhood Chain block"}>
      <span className="text-ink-3">RH CHAIN</span>
      <span className="tabular text-ink">{block === undefined ? "—" : <RollingText value={block.toLocaleString("en-US")} />}</span>
      <span className={cn("text-[10px] tracking-[0.08em]", fresh ? "text-eligible" : degraded ? "text-conditional" : "text-ink-4")}>
        {block === undefined ? (degraded ? "OFFLINE" : "CONNECTING") : fresh ? "LIVE" : degraded ? "DEGRADED · LAST KNOWN" : "LAST KNOWN"}
      </span>
    </span>
  );
}
