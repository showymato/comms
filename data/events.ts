import type { EligibilityEvent, EligibilityStatus, EventType, ReasonCode } from "@/types";
import { ASSETS } from "./assets";
import { isoAgo } from "./reference";
import { prng } from "@/lib/prng";

export interface EventTemplate {
  type: EventType;
  previous: EligibilityStatus;
  current: EligibilityStatus;
  reason: ReasonCode;
}

/** Each template maps to a transition the engine can actually produce. */
export const EVENT_TEMPLATES: readonly EventTemplate[] = [
  { type: "ELIGIBILITY_CHANGED", previous: "ELIGIBLE", current: "CONDITIONAL", reason: "LIQUIDITY_BELOW_MINIMUM" },
  { type: "ELIGIBILITY_CHANGED", previous: "CONDITIONAL", current: "ELIGIBLE", reason: "ALL_CHECKS_PASSED" },
  { type: "ELIGIBILITY_CHANGED", previous: "ELIGIBLE", current: "INELIGIBLE", reason: "TRANSFER_DISABLED" },
  { type: "ELIGIBILITY_CHANGED", previous: "INELIGIBLE", current: "ELIGIBLE", reason: "TRANSFER_REENABLED" },
  { type: "ASSET_PAUSED", previous: "ELIGIBLE", current: "INELIGIBLE", reason: "TOKEN_PAUSED" },
  { type: "ORACLE_UNAVAILABLE", previous: "ELIGIBLE", current: "UNKNOWN", reason: "INSUFFICIENT_EVIDENCE" },
  { type: "ELIGIBILITY_CHANGED", previous: "UNKNOWN", current: "ELIGIBLE", reason: "ORACLE_RECOVERED" },
  { type: "TRANSFER_RESTRICTED", previous: "ELIGIBLE", current: "INELIGIBLE", reason: "TRANSFER_RESTRICTED" },
  { type: "ASSET_REDEEMED", previous: "ELIGIBLE", current: "INELIGIBLE", reason: "ASSET_INACTIVE" },
  { type: "ASSET_REACTIVATED", previous: "INELIGIBLE", current: "ELIGIBLE", reason: "ASSET_REACTIVATED" },
];

/** Seed feed: 28 events over the last few hours, newest first. Ids are stable per index. */
export function seedEvents(): EligibilityEvent[] {
  const r = prng(2026);
  const out: EligibilityEvent[] = [];
  let age = 40;
  for (let i = 0; i < 28; i++) {
    const t = EVENT_TEMPLATES[Math.floor(r() * EVENT_TEMPLATES.length)];
    const a = ASSETS[Math.floor(r() * ASSETS.length)];
    out.push({ id: `evt_seed_${i}`, timestamp: isoAgo(age), address: a.address, symbol: a.symbol, ...t });
    age += 90 + Math.floor(r() * 900);
  }
  return out;
}

type Row = [number, EligibilityStatus, EligibilityStatus, ReasonCode, EventType?];

const H = (symbol: string, rows: Row[]): EligibilityEvent[] => {
  const a = ASSETS.find((x) => x.symbol === symbol)!;
  return rows.map(([ago, previous, current, reason, type], i) => ({
    id: `hist_${symbol}_${i}`,
    timestamp: isoAgo(ago),
    address: a.address,
    symbol,
    type: type ?? "ELIGIBILITY_CHANGED",
    previous,
    current,
    reason,
  }));
};

const D = 86_400;

/** Hand-authored histories (newest first). Assets without one get a single initial evaluation. */
export const HISTORIES: Record<string, EligibilityEvent[]> = {
  AAPL: H("AAPL", [
    [1300, "INELIGIBLE", "ELIGIBLE", "TRANSFER_REENABLED"],
    [1682, "CONDITIONAL", "INELIGIBLE", "TRANSFER_DISABLED"],
    [D + 16_000, "ELIGIBLE", "CONDITIONAL", "LIQUIDITY_BELOW_MINIMUM"],
    [3 * D + 46_000, "UNKNOWN", "ELIGIBLE", "ALL_CHECKS_PASSED"],
  ]),
  TSLA: H("TSLA", [
    [9_300, "ELIGIBLE", "CONDITIONAL", "LIQUIDITY_BELOW_MINIMUM"],
    [2 * D, "INELIGIBLE", "ELIGIBLE", "ASSET_REACTIVATED", "ASSET_REACTIVATED"],
    [2 * D + 4_000, "ELIGIBLE", "INELIGIBLE", "TOKEN_PAUSED", "ASSET_PAUSED"],
    [5 * D, "UNKNOWN", "ELIGIBLE", "ALL_CHECKS_PASSED"],
  ]),
  NFLX: H("NFLX", [
    [1_140, "ELIGIBLE", "INELIGIBLE", "TRANSFER_DISABLED"],
    [4 * D, "UNKNOWN", "ELIGIBLE", "ALL_CHECKS_PASSED"],
  ]),
  COIN: H("COIN", [
    [3_600, "ELIGIBLE", "INELIGIBLE", "TOKEN_PAUSED", "ASSET_PAUSED"],
    [6 * D, "UNKNOWN", "ELIGIBLE", "ALL_CHECKS_PASSED"],
  ]),
  AMD: H("AMD", [
    [780, "ELIGIBLE", "UNKNOWN", "INSUFFICIENT_EVIDENCE", "ORACLE_UNAVAILABLE"],
    [3 * D, "UNKNOWN", "ELIGIBLE", "ORACLE_RECOVERED"],
    [3 * D + 9_000, "ELIGIBLE", "UNKNOWN", "INSUFFICIENT_EVIDENCE", "ORACLE_UNAVAILABLE"],
  ]),
};
