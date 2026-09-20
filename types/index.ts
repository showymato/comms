/**
 * COMMS domain model.
 * Shapes mirror the five conceptual tables in the spec:
 * assets, eligibility_checks, eligibility_results, policies, eligibility_events.
 * Keep these transport-agnostic so a real REST client can return them unchanged.
 */

export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "CONDITIONAL" | "UNKNOWN";

export type Network = "RH_CHAIN";

/**
 * Where a value came from. ONCHAIN / ROBINHOOD / BLOCKSCOUT / COINGECKO / ALPHA_VANTAGE are live providers.
 * ORACLE / ISSUER / INDEXER are only ever produced by the demo dataset. DEMO marks any value COMMS filled in
 * for demonstration (hybrid mode). NONE means no source could supply the value → the check is UNKNOWN.
 */
export type EvidenceSource =
  | "ONCHAIN"
  | "ORACLE"
  | "ISSUER"
  | "INDEXER"
  | "ROBINHOOD"
  | "BLOCKSCOUT"
  | "COINGECKO"
  | "ALPHA_VANTAGE"
  | "DEMO"
  | "NONE";

/** Per-check outcome. UNKNOWN means no evidence was available — never a guess. */
export type CheckResult = "PASS" | "FAIL" | "UNKNOWN";

export type CheckId =
  | "assetActive"
  | "transferEnabled"
  | "oracleHealthy"
  | "priceFresh"
  | "redemptionEnabled"
  | "tokenPaused"
  | "transferRestricted"
  | "issuerRestriction"
  | "collateralSupported";

export type ReasonCode =
  | "ALL_CHECKS_PASSED"
  | "ASSET_INACTIVE"
  | "TRANSFER_DISABLED"
  | "ORACLE_UNHEALTHY"
  | "PRICE_STALE"
  | "REDEMPTION_DISABLED"
  | "TOKEN_PAUSED"
  | "TRANSFER_RESTRICTED"
  | "ISSUER_RESTRICTION"
  | "COLLATERAL_UNSUPPORTED"
  | "LIQUIDITY_BELOW_MINIMUM"
  | "INSUFFICIENT_EVIDENCE"
  | "TRANSFER_REENABLED"
  | "ORACLE_RECOVERED"
  | "ASSET_REACTIVATED";

/** Raw evidence for one field. `value: null` means the source returned nothing. */
export interface Evidence<T = boolean> {
  value: T | null;
  source: EvidenceSource;
  /** 0 when the evidence is not tied to a block (off-chain sources, or no evidence) */
  blockNumber: number;
  /** ISO-8601, UTC */
  timestamp: string;
  /** 0..1. null = the source does not report a confidence; COMMS never invents one. */
  confidence: number | null;
  /** Contract the evidence was read from (onchain evidence). */
  contract?: string;
  /** Network name (onchain evidence). */
  network?: string;
  /** Human-readable provenance, or the reason the value is unknown. */
  note?: string;
}

/** Current observable state of a Stock Token — the `assets` row + evidence. */
export interface AssetState {
  active: Evidence;
  transferEnabled: Evidence;
  oracleHealthy: Evidence;
  /** true when the last price update is within the freshness window */
  priceFresh: Evidence;
  redemptionEnabled: Evidence;
  paused: Evidence;
  transferRestricted: Evidence;
  /** true when the issuer has placed a restriction on the token */
  issuerRestricted: Evidence;
  collateralSupported: Evidence;
  liquidityUsd: Evidence<number>;
}

export interface Asset {
  address: string;
  name: string;
  symbol: string;
  underlying: string;
  network: Network;
  /** seconds since last state update, at the reference time of the snapshot */
  updatedAgoSec: number;
  state: AssetState;
  /** Present for assets built from the live Robinhood registry. */
  live?: LiveAssetMeta;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  minLiquidityUsd: number;
  oracleRequired: boolean;
  transferRequired: boolean;
  redemptionRequired: boolean;
  createdAt: string;
  builtIn: boolean;
}

export type PolicyInput = Pick<
  Policy,
  "name" | "description" | "minLiquidityUsd" | "oracleRequired" | "transferRequired" | "redemptionRequired"
>;

/** One row of the decision breakdown — the `eligibility_checks` entity. */
export interface CheckOutcome {
  id: CheckId;
  label: string;
  /** what a passing state reads as, e.g. "Enabled" */
  passLabel: string;
  failLabel: string;
  result: CheckResult;
  /** true if the active policy makes this check decisive */
  required: boolean;
  /** raw field name as stored, e.g. "transferEnabled" */
  field: string;
  /** rendered value, e.g. "TRUE" */
  rawValue: string;
  evidence: Evidence;
}

export interface PolicyRuleOutcome {
  id: "minLiquidity" | "oracleRequired" | "transferRequired" | "redemptionRequired";
  label: string;
  requirement: string;
  actual: string;
  result: CheckResult;
}

/** The `eligibility_results` entity. */
export interface EligibilityResult {
  address: string;
  policyId: string;
  status: EligibilityStatus;
  /** Supplementary. null when the status is UNKNOWN. */
  score: number | null;
  reasons: ReasonCode[];
  checks: CheckOutcome[];
  rules: PolicyRuleOutcome[];
  passed: number;
  failed: number;
  unknown: number;
  liquidity: Evidence<number>;
  evaluatedAt: string;
}

/** The `eligibility_events` entity. */
export type EventType =
  | "ELIGIBILITY_CHANGED"
  | "ASSET_PAUSED"
  | "ORACLE_UNAVAILABLE"
  | "TRANSFER_RESTRICTED"
  | "ASSET_REDEEMED"
  | "ASSET_REACTIVATED";

export interface EligibilityEvent {
  id: string;
  /** ISO-8601, UTC */
  timestamp: string;
  address: string;
  symbol: string;
  type: EventType;
  previous: EligibilityStatus;
  current: EligibilityStatus;
  reason: ReasonCode;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  status: "ACTIVE" | "PAUSED" | "FAILING";
  events: EventType[];
  lastDeliveryAgoSec: number;
  successRate: number;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: EventType;
  timestamp: string;
  httpStatus: number;
  durationMs: number;
  attempt: number;
  payload: WebhookPayload;
}

export interface WebhookPayload {
  event: EventType;
  asset: string;
  symbol: string;
  previous: EligibilityStatus;
  current: EligibilityStatus;
  reason: ReasonCode;
  timestamp: string;
}

/** A recorded run of the checker — feeds the /eligibility "recent checks" list. */
export interface CheckRun {
  id: string;
  address: string;
  symbol: string;
  policyId: string;
  status: EligibilityStatus;
  timestamp: string;
}

/* ───────────── live data model ───────────── */

export type DataMode = "live" | "demo" | "hybrid";

export type AssetLifecycle = "ACTIVE" | "INACTIVE" | "UNKNOWN";
export type TradingStatus = "TRADABLE" | "UNTRADABLE" | "UNKNOWN";

export interface TradingSession {
  whole: TradingStatus;
  fractional: TradingStatus;
}

export interface TradingCapabilities {
  market: TradingSession;
  extended: TradingSession;
  overnight: TradingSession;
}

export interface Deployment {
  contractAddress: string;
  chainId: number;
  networkName: string;
}

/** Normalized `/rhj/assets` row. Decimal strings are kept as strings — never rounded through floats. */
export interface RegistryAsset {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  deployments: Deployment[];
  currentMultiplier: string;
  pendingMultiplier: string | null;
  pendingMultiplierEffectiveTime: string | null;
  logoUrl: string | null;
  status: AssetLifecycle;
  /** the raw API enum, kept so the UI never claims more than the API said */
  rawStatus: string;
  tradingCapabilities: TradingCapabilities;
  tokenDecimals: number | null;
  isin: string | null;
}

/**
 * Normalized `/rhj/prices/{symbol}` quote. bid / ask are the RAW underlying-equity quote, not multiplier-adjusted.
 */
export interface PriceSnapshot {
  symbol: string;
  currency: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  spreadPct: number;
  dailyVolume: number | null;
  dailyHigh: number | null;
  dailyLow: number | null;
  isTradingHalt: boolean;
  /** ISO — when the API generated the quote */
  generatedAt: string;
  /** ISO — when COMMS received it */
  fetchedAt: string;
}

export type CorporateActionType =
  | "FORWARD_SPLIT"
  | "REVERSE_SPLIT"
  | "CASH_DIVIDEND"
  | "STOCK_DIVIDEND"
  | "SPIN_OFF"
  | "CASH_MERGER"
  | "STOCK_MERGER"
  | "REDEMPTION"
  | "NAME_CHANGE"
  | "OTHER";

export interface CorporateAction {
  id: string;
  type: CorporateActionType;
  rawType: string;
  status: "IN_PROGRESS" | "COMPLETED" | "UNKNOWN";
  /** ISO date (YYYY-MM-DD) or null */
  processDate: string | null;
  tokenSymbol: string;
  deployments: Deployment[];
  underlyingSymbol: string | null;
  /** old → new (splits) or a single rate (dividends) — as reported */
  oldRate: string | null;
  newRate: string | null;
  rate: string | null;
  /** everything else the API returned under `details`, unmodified */
  details: Record<string, unknown>;
}

export interface LiveAssetMeta {
  registryId: string;
  tokenName: string;
  logoUrl: string | null;
  lifecycle: AssetLifecycle;
  rawStatus: string;
  multiplier: string;
  pendingMultiplier: string | null;
  pendingMultiplierEffectiveTime: string | null;
  trading: TradingCapabilities;
  price: PriceSnapshot | null;
  isin: string | null;
  decimals: number | null;
  /** ISO — registry fetch time */
  registryFetchedAt: string;
  /** the contract has a proxy or code we could verify */
  hasBytecode: boolean | null;
}

export type ProviderId = "robinhood" | "chain" | "blockscout" | "coingecko" | "alphavantage" | "comms";
/**
 * LIVE only when data was fetched successfully inside its freshness window. LAST_KNOWN / STALE mean the last
 * good value is being shown past that window. DEGRADED = the latest request failed but a last value exists.
 */
export type ProviderHealth = "LIVE" | "LAST_KNOWN" | "STALE" | "DEGRADED" | "OFFLINE" | "NOT_CONFIGURED" | "CONNECTING" | "ON_DEMAND";

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  role: "PRIMARY" | "ONCHAIN SOURCE OF TRUTH" | "ENRICHMENT" | "FALLBACK" | "INTERNAL";
  health: ProviderHealth;
  configured: boolean;
  /** ms of the most recent real request, null if none yet */
  latencyMs: number | null;
  lastSuccessAt: string | null;
  lastError: string | null;
}

export interface ChainState {
  chainId: number;
  block: number;
  /** ISO — block timestamp */
  blockTime: string;
  /** ISO — when we read it */
  fetchedAt: string;
}

export interface EligibilityEventLive {
  id: string;
  timestamp: string;
  symbol: string;
  kind: "PRICE_UPDATED" | "STATE_CHECKED" | "ELIGIBILITY_EVALUATED" | "ELIGIBILITY_CHANGED" | "STATE_CHANGED" | "CORPORATE_ACTION" | "BLOCK_ADVANCED";
  /** e.g. "$213.45 → $213.48" or "ACTIVE" */
  detail: string;
  source: EvidenceSource;
  previous?: EligibilityStatus;
  current?: EligibilityStatus;
}
