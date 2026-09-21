"use client";

import { useMemo } from "react";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import type { Asset, EligibilityResult, ProviderHealth } from "@/types";
import type { Health, SphereSystem, SphereToken } from "./engine";

/** Preferred order only — a symbol is used solely when it exists in the real registry. */
const FEATURED = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "GOOGL", "META", "AMD"];
const MAX_TOKENS = 10;

export interface SphereItem {
  id: string;
  asset: Asset;
  result: EligibilityResult;
}

const toHealth = (h: ProviderHealth): Health => {
  switch (h) {
    case "LIVE":
      return "ok";
    case "LAST_KNOWN":
    case "STALE":
    case "DEGRADED":
      return "warn";
    case "OFFLINE":
      return "down";
    default:
      return "unknown";
  }
};

/**
 * Everything the sphere draws, derived from the live registry + the deterministic engine.
 * Nothing here is typed in: tokens are registry assets, statuses are engine results, system-node health is the real
 * outcome of the last request to that source.
 */
export function useSphereData() {
  const ev = useEvaluated();
  const registryH = useSliceHealthFor("registry");
  const pricesH = useSliceHealthFor("prices");
  const chainH = useSliceHealthFor("chain");

  return useMemo(() => {
    const idx = ev.assets.map((_, i) => i);
    const rank = (i: number) => {
      const f = FEATURED.indexOf(ev.assets[i].symbol);
      return f >= 0 ? f : FEATURED.length + (ev.assets[i].live?.lifecycle === "ACTIVE" ? 0 : 1000);
    };
    idx.sort((a, b) => rank(a) - rank(b) || ev.assets[a].symbol.localeCompare(ev.assets[b].symbol));
    const featured = idx.filter((i) => FEATURED.includes(ev.assets[i].symbol));
    const rest = idx.filter((i) => !FEATURED.includes(ev.assets[i].symbol));
    const room = Math.max(0, MAX_TOKENS - featured.length);
    // a real, evenly spaced sample of the remaining registry
    const sample = rest.length <= room ? rest : Array.from({ length: room }, (_, k) => rest[Math.floor((k * rest.length) / room)]);
    const picked = [...featured, ...sample].slice(0, MAX_TOKENS);

    const items: SphereItem[] = picked.map((i) => ({ id: ev.assets[i].address.toLowerCase(), asset: ev.assets[i], result: ev.results[i] }));
    const tokens: SphereToken[] = items.map((it) => ({
      id: it.id,
      symbol: it.asset.symbol,
      status: it.result.status,
      active: it.asset.live ? (it.asset.live.lifecycle === "ACTIVE" ? true : it.asset.live.lifecycle === "INACTIVE" ? false : null) : null,
    }));

    const loaded = ev.assets.length > 0;
    const demo = DATA_MODE === "demo";
    const engine: Health = loaded ? "ok" : ev.error ? "down" : "unknown";
    const src = (h: ProviderHealth): Health => (demo ? "unknown" : toHealth(h));
    const system: SphereSystem[] = [
      { id: "registry", label: "Registry", health: src(registryH) },
      { id: "prices", label: "Prices", health: src(pricesH) },
      { id: "chain", label: "RH Chain", health: src(chainH) },
      { id: "state", label: "State", health: engine },
      { id: "checks", label: "Checks", health: engine },
      { id: "policy", label: "Policy", health: engine },
      { id: "decision", label: "Decision", health: engine },
    ];
    return { items, tokens, system, loaded, total: ev.assets.length, error: ev.error, policy: ev.policy };
  }, [ev.assets, ev.results, ev.error, ev.policy, registryH, pricesH, chainH]);
}
