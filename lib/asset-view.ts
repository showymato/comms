import type { Asset, Evidence } from "@/types";

export type Tone = "good" | "bad" | "none";

export interface Flag {
  text: string;
  tone: Tone;
}

const flag = (e: Evidence, yes: string, no: string, goodWhen = true): Flag =>
  e.value === null ? { text: "UNKNOWN", tone: "none" } : { text: e.value ? yes : no, tone: e.value === goodWhen ? "good" : "bad" };

export const oracleFlag = (a: Asset): Flag => {
  const h = a.state.oracleHealthy.value;
  const f = a.state.priceFresh.value;
  if (h === null || f === null) return { text: "UNKNOWN", tone: "none" };
  if (!h) return { text: "Unhealthy", tone: "bad" };
  if (!f) return { text: "Stale", tone: "bad" };
  return { text: "Healthy", tone: "good" };
};

export const transferFlag = (a: Asset) => flag(a.state.transferEnabled, "Enabled", "Disabled");
export const redemptionFlag = (a: Asset) => flag(a.state.redemptionEnabled, "Enabled", "Disabled");

/** Lifecycle shown in the "Status" column. */
export function lifecycle(a: Asset): Flag {
  if (a.state.active.value === null) return { text: "UNKNOWN", tone: "none" };
  if (!a.state.active.value) return { text: "INACTIVE", tone: "bad" };
  if (a.state.paused.value) return { text: "PAUSED", tone: "bad" };
  return { text: "ACTIVE", tone: "good" };
}

export const toneClass: Record<Tone, string> = {
  good: "text-ink",
  bad: "text-ineligible",
  none: "text-unknown",
};
