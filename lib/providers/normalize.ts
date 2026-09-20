/**
 * Pure normalizers: raw provider JSON → COMMS domain types. No I/O, so they are unit-tested.
 * They never fabricate: a field the API omitted becomes null / UNKNOWN, not a default.
 */
import type {
  AssetLifecycle,
  CorporateAction,
  CorporateActionType,
  Deployment,
  PriceSnapshot,
  RegistryAsset,
  TradingCapabilities,
  TradingSession,
  TradingStatus,
} from "@/types";

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export function normalizeDeployments(raw: unknown): Deployment[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((d) => {
    if (!isObj(d)) return [];
    const contractAddress = str(d.contractAddress);
    const chainId = num(d.chainId);
    if (!contractAddress || chainId === null) return [];
    return [{ contractAddress, chainId, networkName: str(d.networkName) ?? `Chain ${chainId}` }];
  });
}

export function lifecycleOf(raw: unknown): AssetLifecycle {
  if (raw === "ASSET_STATUS_ACTIVE") return "ACTIVE";
  if (raw === "ASSET_STATUS_INACTIVE") return "INACTIVE";
  return "UNKNOWN";
}

function tradingStatus(raw: unknown): TradingStatus {
  if (raw === "TRADING_STATUS_TRADABLE") return "TRADABLE";
  if (raw === "TRADING_STATUS_UNTRADABLE") return "UNTRADABLE";
  return "UNKNOWN";
}

const session = (raw: unknown): TradingSession => {
  const o = isObj(raw) ? raw : {};
  return { whole: tradingStatus(o.whole), fractional: tradingStatus(o.fractional) };
};

export function normalizeTrading(raw: unknown): TradingCapabilities {
  const o = isObj(raw) ? raw : {};
  return { market: session(o.market), extended: session(o.extended), overnight: session(o.overnight) };
}

export function normalizeAsset(raw: unknown): RegistryAsset | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const tokenSymbol = str(raw.tokenSymbol);
  if (!id || !tokenSymbol) return null;
  return {
    id,
    tokenSymbol,
    tokenName: str(raw.tokenName) ?? tokenSymbol,
    deployments: normalizeDeployments(raw.deployments),
    currentMultiplier: str(raw.currentMultiplier) ?? "1",
    pendingMultiplier: str(raw.pendingMultiplier),
    pendingMultiplierEffectiveTime: str(raw.pendingMultiplierEffectiveTime),
    logoUrl: str(raw.logoUrl),
    status: lifecycleOf(raw.status),
    rawStatus: str(raw.status) ?? "",
    tradingCapabilities: normalizeTrading(raw.tradingCapabilities),
    tokenDecimals: num(raw.tokenDecimals),
    isin: str(raw.isin),
  };
}

export function normalizeAssets(body: unknown): RegistryAsset[] {
  const list = isObj(body) && Array.isArray(body.assets) ? body.assets : [];
  return list.map(normalizeAsset).filter((a): a is RegistryAsset => a !== null);
}

/** Returns null when the quote is unusable (missing / non-numeric / crossed bid-ask) — the caller then reports UNKNOWN. */
export function normalizeQuote(raw: unknown, fetchedAt: string): PriceSnapshot | null {
  if (!isObj(raw)) return null;
  const symbol = str(raw.tokenSymbol);
  const bid = num(raw.bid);
  const ask = num(raw.ask);
  const generatedAt = str(raw.generatedAt);
  if (!symbol || bid === null || ask === null || !generatedAt || bid <= 0 || ask <= 0 || ask < bid) return null;
  const mid = (bid + ask) / 2;
  const spread = ask - bid;
  return {
    symbol,
    currency: str(raw.currency) ?? "USD",
    bid,
    ask,
    mid,
    spread,
    spreadPct: (spread / mid) * 100,
    dailyVolume: num(raw.dailyTradingVolume),
    dailyHigh: num(raw.dailyHigh),
    dailyLow: num(raw.dailyLow),
    isTradingHalt: raw.isTradingHalt === true,
    generatedAt,
    fetchedAt,
  };
}

export function normalizeQuotes(body: unknown, fetchedAt: string): PriceSnapshot[] {
  const list = isObj(body) && Array.isArray(body.quotes) ? body.quotes : [];
  return list.map((q) => normalizeQuote(q, fetchedAt)).filter((q): q is PriceSnapshot => q !== null);
}

const ACTION_TYPES: Record<string, CorporateActionType> = {
  CORPORATE_ACTION_TYPE_FORWARD_SPLIT: "FORWARD_SPLIT",
  CORPORATE_ACTION_TYPE_REVERSE_SPLIT: "REVERSE_SPLIT",
  CORPORATE_ACTION_TYPE_CASH_DIVIDEND: "CASH_DIVIDEND",
  CORPORATE_ACTION_TYPE_STOCK_DIVIDEND: "STOCK_DIVIDEND",
  CORPORATE_ACTION_TYPE_SPIN_OFF: "SPIN_OFF",
  CORPORATE_ACTION_TYPE_CASH_MERGER: "CASH_MERGER",
  CORPORATE_ACTION_TYPE_STOCK_MERGER: "STOCK_MERGER",
  CORPORATE_ACTION_TYPE_REDEMPTION: "REDEMPTION",
  CORPORATE_ACTION_TYPE_NAME_CHANGE: "NAME_CHANGE",
};

const p2 = (n: number) => String(n).padStart(2, "0");

export function normalizeCorporateAction(raw: unknown): CorporateAction | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  const tokenSymbol = str(raw.tokenSymbol);
  if (!id || !tokenSymbol) return null;
  const rawType = str(raw.type) ?? "";
  const pd = isObj(raw.processDate) ? raw.processDate : null;
  const y = pd ? num(pd.year) : null;
  const m = pd ? num(pd.month) : null;
  const d = pd ? num(pd.day) : null;
  const details = isObj(raw.details) ? raw.details : {};
  // `details` is keyed by the action kind (e.g. { cashDividend: { underlyingSymbol, rate } }).
  const inner: Json = Object.values(details).find(isObj) ?? {};
  const pick = (re: RegExp) => {
    for (const [k, v] of Object.entries(inner)) if (re.test(k) && (typeof v === "string" || typeof v === "number")) return String(v);
    return null;
  };
  const rate = inner.rate;
  return {
    id,
    type: ACTION_TYPES[rawType] ?? "OTHER",
    rawType,
    status: raw.status === "CORPORATE_ACTION_STATUS_IN_PROGRESS" ? "IN_PROGRESS" : raw.status === "CORPORATE_ACTION_STATUS_COMPLETED" ? "COMPLETED" : "UNKNOWN",
    processDate: y !== null && m !== null && d !== null ? `${y}-${p2(m)}-${p2(d)}` : null,
    tokenSymbol,
    deployments: normalizeDeployments(raw.deployments),
    underlyingSymbol: str(inner.underlyingSymbol),
    oldRate: pick(/^(old|from)/i),
    newRate: pick(/^(new|to)/i),
    rate: typeof rate === "string" || typeof rate === "number" ? String(rate) : null,
    details: details as Record<string, unknown>,
  };
}

export function normalizeCorporateActions(body: unknown): CorporateAction[] {
  const list = isObj(body) && Array.isArray(body.corpActions) ? body.corpActions : [];
  return list.map(normalizeCorporateAction).filter((a): a is CorporateAction => a !== null);
}
