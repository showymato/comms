import type { DataMode } from "@/types";

/**
 * Single source of truth for data mode, polling cadence and freshness thresholds.
 * Cadences are deliberately conservative: the Robinhood API is public and rate-limited, and the
 * server layer caches on top of these, so N visitors still cost one upstream request per window.
 */
const raw = process.env.NEXT_PUBLIC_DATA_MODE;
export const DATA_MODE: DataMode = raw === "demo" || raw === "hybrid" ? raw : "live";

export const CHAIN_ID = 4663;
export const CHAIN_NAME = "Robinhood Chain";

/** client → COMMS API polling intervals (ms) */
export const POLL = {
  registry: 5 * 60_000,
  corporateActions: 5 * 60_000,
  prices: 30_000,
  chain: 15_000,
  status: 60_000,
} as const;

/** server-side cache windows (s) — what we ask of upstream */
export const SERVER_TTL = {
  registry: 300,
  corporateActions: 300,
  prices: 15,
  chain: 8,
  contract: 30,
} as const;

/** age (s) at which a datum stops being "fresh" / becomes "stale" */
export const FRESHNESS = {
  price: { fresh: 45, stale: 300 },
  registry: { fresh: 10 * 60, stale: 30 * 60 },
  chain: { fresh: 45, stale: 180 },
  /** pinned-block contract reads refresh every 60 s and are cached server-side for 30 s */
  contract: { fresh: 120, stale: 600 },
} as const;

export type Freshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN";

export function freshnessOf(ageSec: number | null, t: { fresh: number; stale: number }): Freshness {
  if (ageSec === null || !Number.isFinite(ageSec)) return "UNKNOWN";
  if (ageSec <= t.fresh) return "FRESH";
  if (ageSec <= t.stale) return "AGING";
  return "STALE";
}

export const isDemo = DATA_MODE === "demo";
export const isHybrid = DATA_MODE === "hybrid";
export const isLive = DATA_MODE === "live";
