/**
 * COMMS domain model.
 * Shapes mirror the five conceptual tables in the spec:
 * assets, eligibility_checks, eligibility_results, policies, eligibility_events.
 * Keep these transport-agnostic so a real REST client can return them unchanged.
 */

export type EligibilityStatus = "ELIGIBLE" | "INELIGIBLE" | "CONDITIONAL" | "UNKNOWN";

export type Network = "RH_CHAIN";

export type EvidenceSource = "ONCHAIN" | "ORACLE" | "ISSUER" | "INDEXER";

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
  blockNumber: number;
  /** ISO-8601, UTC */
  timestamp: string;
  /** 0..1 */
  confidence: number;
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
  /** seconds since last state update, at the reference time of the mock snapshot */
  updatedAgoSec: number;
  state: AssetState;
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
