"use client";

import { useMemo } from "react";
import { DATA_MODE } from "@/lib/data/config";
import { ageSec, liveManager, sliceHealth, type Slice, type SliceKind } from "@/lib/data/live-manager";
import { useLive, useNowMs } from "@/hooks/use-live";
import type { ProviderHealth } from "@/types";

export interface StatusRow {
  id: string;
  label: string;
  health: ProviderHealth;
  latencyMs: number | null;
  /** seconds since the data was fetched */
  ageSec: number | null;
  error: string | null;
  /** re-request this source */
  retry?: () => void;
}

const worst = (hs: ProviderHealth[]): ProviderHealth => {
  const order: ProviderHealth[] = ["OFFLINE", "STALE", "DEGRADED", "LAST_KNOWN", "CONNECTING", "LIVE"];
  return order.find((h) => hs.includes(h)) ?? "CONNECTING";
};

function rowOf(id: string, label: string, slices: Array<[Slice<unknown>, SliceKind]>, now: number, retry?: () => void): StatusRow {
  const health = worst(slices.map(([s, k]) => sliceHealth(s, k, now)));
  const primary = slices[0][0];
  const err = slices.map(([s]) => s.error).find(Boolean) ?? null;
  return { id, label, health, latencyMs: primary.latencyMs, ageSec: ageSec(primary.fetchedAt, now), error: err, retry };
}

/**
 * Real health of every data dependency, derived from actual request outcomes and data age.
 * In demo mode nothing is connected, so every row says so instead of claiming LIVE.
 */
export function useSystemStatus(): StatusRow[] {
  const s = useLive((x) => x);
  const now = useNowMs(1000);
  return useMemo(() => {
    if (DATA_MODE === "demo") {
      return ["Asset registry", "Price feed", "Robinhood Chain", "Eligibility engine", "Corporate actions", "API"].map((label) => ({
        id: label,
        label,
        health: "NOT_CONFIGURED" as const,
        latencyMs: null,
        ageSec: null,
        error: "Demo mode — no live source is connected.",
      }));
    }
    const m = liveManager();
    const rows: StatusRow[] = [
      rowOf("registry", "Asset registry", [[s.registry, "registry"]], now, () => m.refresh("registry")),
      rowOf("prices", "Price feed", [[s.prices, "price"]], now, () => m.refresh("prices")),
      rowOf("chain", "Robinhood Chain", [[s.chain, "chain"]], now, () => m.refresh("chain")),
      rowOf("corp", "Corporate actions", [[s.corporateActions, "registry"]], now, () => m.refresh("corporateActions")),
    ];
    // The engine is local and deterministic: it is available exactly when it has a registry to evaluate.
    rows.splice(3, 0, {
      id: "engine",
      label: "Eligibility engine",
      health: s.assets.length > 0 ? "LIVE" : s.registry.error ? "OFFLINE" : "CONNECTING",
      latencyMs: null,
      ageSec: s.evaluatedAt === null ? null : Math.max(0, (now - s.evaluatedAt) / 1000),
      error: null,
    });
    const api = rows.filter((r) => r.id !== "engine").map((r) => r.health);
    rows.push({
      id: "api",
      label: "COMMS API",
      health: api.every((h) => h === "OFFLINE") ? "OFFLINE" : api.some((h) => h === "CONNECTING") && api.every((h) => h === "CONNECTING" || h === "LIVE") ? "CONNECTING" : "LIVE",
      latencyMs: null,
      ageSec: null,
      error: null,
    });
    return rows;
  }, [s, now]);
}

/** One word for the whole system: LIVE only if nothing is degraded. */
export function overallHealth(rows: StatusRow[]): ProviderHealth {
  const relevant = rows.filter((r) => r.health !== "NOT_CONFIGURED");
  if (relevant.length === 0) return "NOT_CONFIGURED";
  return worst(relevant.map((r) => r.health));
}

/** Health of one slice, for compact inline indicators. */
export function useSliceHealthFor(key: "registry" | "prices" | "chain" | "corporateActions"): ProviderHealth {
  const slice = useLive((x) => x[key]);
  const now = useNowMs(1000);
  if (DATA_MODE === "demo") return "NOT_CONFIGURED";
  if (now === 0) return slice.data === null ? "CONNECTING" : "LAST_KNOWN";
  return sliceHealth(slice as Slice<unknown>, key === "prices" ? "price" : key === "chain" ? "chain" : "registry", now);
}
