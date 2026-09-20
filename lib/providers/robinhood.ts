/** Robinhood Chain Stock Token public API — PRIMARY source for registry, quotes and corporate actions. */
import { requestJson, type Timed } from "@/lib/data/request";
import type { CorporateAction, PriceSnapshot, RegistryAsset } from "@/types";
import { normalizeAssets, normalizeCorporateActions, normalizeQuote, normalizeQuotes } from "./normalize";

const BASE = process.env.ROBINHOOD_API_BASE || "https://api.robinhood.com/rhj";
const opts = { timeoutMs: 10_000, retries: 2 } as const;

/** GET /rhj/assets */
export async function getAssets(): Promise<Timed<RegistryAsset[]>> {
  const t = await requestJson<unknown>(`${BASE}/assets`, opts);
  const data = normalizeAssets(t.data);
  if (data.length === 0) throw new Error("Robinhood /assets returned no usable assets");
  return { data, latencyMs: t.latencyMs };
}

/** GET /rhj/prices/{symbol}. Raw underlying-equity bid/ask — NOT multiplier-adjusted. */
export async function getPrice(symbol: string): Promise<Timed<PriceSnapshot | null>> {
  const t = await requestJson<{ quotes?: unknown[] }>(`${BASE}/prices/${encodeURIComponent(symbol)}`, opts);
  const fetchedAt = new Date().toISOString();
  const q = Array.isArray(t.data.quotes) ? t.data.quotes[0] : undefined;
  return { data: normalizeQuote(q, fetchedAt), latencyMs: t.latencyMs };
}

/** GET /rhj/prices (no symbol) — every quote in one request; how the dashboard counts live prices without N calls. */
export async function getAllPrices(): Promise<Timed<PriceSnapshot[]>> {
  const t = await requestJson<unknown>(`${BASE}/prices`, opts);
  return { data: normalizeQuotes(t.data, new Date().toISOString()), latencyMs: t.latencyMs };
}

/** GET /rhj/corporate-actions */
export async function getCorporateActions(): Promise<Timed<CorporateAction[]>> {
  const t = await requestJson<unknown>(`${BASE}/corporate-actions`, opts);
  return { data: normalizeCorporateActions(t.data), latencyMs: t.latencyMs };
}
