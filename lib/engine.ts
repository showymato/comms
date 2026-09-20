import type {
  Asset,
  AssetState,
  CheckId,
  CheckOutcome,
  CheckResult,
  EligibilityResult,
  Evidence,
  Policy,
  PolicyRuleOutcome,
  ReasonCode,
} from "@/types";

/**
 * Deterministic eligibility engine. Pure: (asset state, policy) → result.
 * No I/O, no clock reads, no randomness — the same input always yields the same output.
 *
 * Decision rules
 *  1. A required check that FAILS                      → INELIGIBLE
 *  2. Otherwise, a required check with NO evidence     → UNKNOWN (INSUFFICIENT_EVIDENCE)
 *  3. Otherwise, liquidity below the policy minimum    → CONDITIONAL
 *  4. Otherwise                                        → ELIGIBLE
 * The score is supplementary and never overrides the status.
 */

interface CheckSpec {
  id: CheckId;
  label: string;
  field: keyof AssetState;
  /** which value of the boolean field counts as a pass */
  passWhen: boolean;
  passText: string;
  failText: string;
  reason: ReasonCode;
  /** null = always required; otherwise the policy flag that makes it required */
  requiredBy: keyof Pick<Policy, "oracleRequired" | "transferRequired" | "redemptionRequired"> | null;
}

export const CHECK_SPECS: readonly CheckSpec[] = [
  { id: "assetActive", label: "Asset active", field: "active", passWhen: true, passText: "PASS", failText: "FAIL", reason: "ASSET_INACTIVE", requiredBy: null },
  { id: "transferEnabled", label: "Transfer enabled", field: "transferEnabled", passWhen: true, passText: "PASS", failText: "FAIL", reason: "TRANSFER_DISABLED", requiredBy: "transferRequired" },
  { id: "oracleHealthy", label: "Oracle healthy", field: "oracleHealthy", passWhen: true, passText: "PASS", failText: "FAIL", reason: "ORACLE_UNHEALTHY", requiredBy: "oracleRequired" },
  { id: "priceFresh", label: "Price data fresh", field: "priceFresh", passWhen: true, passText: "PASS", failText: "STALE", reason: "PRICE_STALE", requiredBy: "oracleRequired" },
  { id: "redemptionEnabled", label: "Redemption enabled", field: "redemptionEnabled", passWhen: true, passText: "PASS", failText: "FAIL", reason: "REDEMPTION_DISABLED", requiredBy: "redemptionRequired" },
  { id: "tokenPaused", label: "Token paused", field: "paused", passWhen: false, passText: "NO", failText: "YES", reason: "TOKEN_PAUSED", requiredBy: null },
  { id: "transferRestricted", label: "Transfer restricted", field: "transferRestricted", passWhen: false, passText: "NO", failText: "YES", reason: "TRANSFER_RESTRICTED", requiredBy: null },
  { id: "issuerRestriction", label: "Issuer restriction", field: "issuerRestricted", passWhen: false, passText: "NONE", failText: "RESTRICTED", reason: "ISSUER_RESTRICTION", requiredBy: null },
  { id: "collateralSupported", label: "Collateral supported", field: "collateralSupported", passWhen: true, passText: "YES", failText: "NO", reason: "COLLATERAL_UNSUPPORTED", requiredBy: null },
] as const;

export const CHECK_COUNT = CHECK_SPECS.length;

const rawText = (v: boolean | null) => (v === null ? "NULL" : v ? "TRUE" : "FALSE");

export function resolveCheck(spec: CheckSpec): (state: AssetState, policy: Policy) => CheckOutcome {
  return (state, policy) => {
    const ev = state[spec.field] as Evidence;
    const result: CheckResult = ev.value === null ? "UNKNOWN" : ev.value === spec.passWhen ? "PASS" : "FAIL";
    return {
      id: spec.id,
      label: spec.label,
      passLabel: spec.passText,
      failLabel: spec.failText,
      result,
      required: spec.requiredBy === null ? true : policy[spec.requiredBy],
      field: spec.id,
      rawValue: rawText(ev.value),
      evidence: ev,
    };
  };
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function evaluateRules(state: AssetState, policy: Policy, checks: CheckOutcome[]): PolicyRuleOutcome[] {
  const by = (id: CheckId) => checks.find((c) => c.id === id)!.result;
  const combine = (...r: CheckResult[]): CheckResult =>
    r.includes("FAIL") ? "FAIL" : r.includes("UNKNOWN") ? "UNKNOWN" : "PASS";
  const liq = state.liquidityUsd.value;

  const liqResult: CheckResult =
    policy.minLiquidityUsd <= 0 ? "PASS" : liq === null ? "UNKNOWN" : liq >= policy.minLiquidityUsd ? "PASS" : "FAIL";

  return [
    {
      id: "minLiquidity",
      label: "Minimum liquidity",
      requirement: policy.minLiquidityUsd > 0 ? `≥ ${usd(policy.minLiquidityUsd)}` : "Not required",
      actual: liq === null ? "No evidence" : usd(liq),
      result: liqResult,
    },
    {
      id: "oracleRequired",
      label: "Oracle required",
      requirement: policy.oracleRequired ? "Healthy + fresh" : "Not required",
      actual: combine(by("oracleHealthy"), by("priceFresh")) === "PASS" ? "Healthy + fresh" : combine(by("oracleHealthy"), by("priceFresh")) === "UNKNOWN" ? "No evidence" : "Unhealthy or stale",
      result: policy.oracleRequired ? combine(by("oracleHealthy"), by("priceFresh")) : "PASS",
    },
    {
      id: "transferRequired",
      label: "Transfer required",
      requirement: policy.transferRequired ? "Enabled" : "Not required",
      actual: by("transferEnabled") === "PASS" ? "Enabled" : by("transferEnabled") === "UNKNOWN" ? "No evidence" : "Disabled",
      result: policy.transferRequired ? by("transferEnabled") : "PASS",
    },
    {
      id: "redemptionRequired",
      label: "Redemption required",
      requirement: policy.redemptionRequired ? "Enabled" : "Not required",
      actual: by("redemptionEnabled") === "PASS" ? "Enabled" : by("redemptionEnabled") === "UNKNOWN" ? "No evidence" : "Disabled",
      result: policy.redemptionRequired ? by("redemptionEnabled") : "PASS",
    },
  ];
}

/** Supplementary score: 90 pts from check pass-rate, 10 pts from liquidity coverage of 2× the minimum. */
function score(passed: number, liquidity: number | null, min: number): number {
  const coverage = min <= 0 ? 1 : Math.min(1, (liquidity ?? 0) / (min * 2));
  return Math.round((passed / CHECK_COUNT) * 90 + coverage * 10);
}

export function evaluate(asset: Pick<Asset, "address" | "state">, policy: Policy, evaluatedAt: string): EligibilityResult {
  const { state } = asset;
  const checks = CHECK_SPECS.map((s) => resolveCheck(s)(state, policy));
  const rules = evaluateRules(state, policy, checks);

  const passed = checks.filter((c) => c.result === "PASS").length;
  const failed = checks.filter((c) => c.result === "FAIL").length;
  const unknown = checks.filter((c) => c.result === "UNKNOWN").length;

  const decisive = checks.filter((c) => c.required);
  const failures = decisive.filter((c) => c.result === "FAIL");
  const gaps = decisive.filter((c) => c.result === "UNKNOWN");
  const liq = state.liquidityUsd.value;
  const liqRule = rules.find((r) => r.id === "minLiquidity")!;

  let status: EligibilityResult["status"];
  let reasons: ReasonCode[];

  if (failures.length > 0) {
    status = "INELIGIBLE";
    reasons = failures.map((c) => CHECK_SPECS.find((s) => s.id === c.id)!.reason);
  } else if (gaps.length > 0 || liqRule.result === "UNKNOWN") {
    status = "UNKNOWN";
    reasons = ["INSUFFICIENT_EVIDENCE"];
  } else if (liqRule.result === "FAIL") {
    status = "CONDITIONAL";
    reasons = ["LIQUIDITY_BELOW_MINIMUM"];
  } else {
    status = "ELIGIBLE";
    reasons = ["ALL_CHECKS_PASSED"];
  }

  return {
    address: asset.address,
    policyId: policy.id,
    status,
    score: status === "UNKNOWN" ? null : score(passed, liq, policy.minLiquidityUsd),
    reasons,
    checks,
    rules,
    passed,
    failed,
    unknown,
    liquidity: state.liquidityUsd,
    evaluatedAt,
  };
}
