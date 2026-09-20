"use client";

import { overallHealth, useSystemStatus } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import { HEALTH } from "@/lib/live/health";
import { cn } from "@/lib/utils";
import type { ProviderHealth } from "@/types";

const WORD: Partial<Record<ProviderHealth, string>> = { LIVE: "OPERATIONAL" };

/** The word for one service. OPERATIONAL means: it answered a real request inside its freshness window. */
export const healthWord = (h: ProviderHealth) => WORD[h] ?? HEALTH[h].label;

/**
 * COMMS SYSTEM — one line per service, derived from real request outcomes.
 * Webhooks are reported honestly: COMMS can send an on-demand test delivery, but runs no persistent delivery pipeline.
 */
export function StatusList({ className }: { className?: string }) {
  const rows = useSystemStatus();
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  const list: Array<{ label: string; health: ProviderHealth; word?: string }> = [
    { label: "Asset registry", health: by.registry?.health ?? "CONNECTING" },
    { label: "RH Chain", health: by.chain?.health ?? "CONNECTING" },
    { label: "Price data", health: by.prices?.health ?? "CONNECTING" },
    { label: "Eligibility engine", health: by.engine?.health ?? "CONNECTING" },
    { label: "API", health: by.api?.health ?? "CONNECTING" },
    { label: "Webhooks", health: "NOT_CONFIGURED", word: "TEST DELIVERY ONLY · NO PERSISTENT PIPELINE" },
  ];
  const overall = overallHealth(rows);
  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <span className="label !text-ink">COMMS system</span>
        <span className={cn("font-mono text-[11px] tracking-[0.08em]", HEALTH[overall].text)}>{DATA_MODE === "demo" ? "DEMO ENVIRONMENT" : healthWord(overall)}</span>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {list.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 py-3.5">
            <span className="font-mono text-[12px] tracking-[0.08em] text-ink uppercase">{r.label}</span>
            <span className={cn("flex items-center gap-2 text-right font-mono text-[11px] tracking-[0.08em]", HEALTH[r.health].text)}>
              <span aria-hidden className={cn("relative size-1.5 shrink-0 rounded-full", HEALTH[r.health].dot)}>
                {r.health === "LIVE" ? <span className="absolute inset-0 animate-pulse-ring rounded-full" /> : null}
              </span>
              {r.word ?? healthWord(r.health)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
