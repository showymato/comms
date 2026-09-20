import type { EligibilityResult } from "@/types";

/** Public API response shape for an eligibility check (see data/api-docs.ts). */
export function toApiResponse(r: EligibilityResult) {
  return {
    address: r.address,
    policy: r.policyId,
    status: r.status,
    eligible: r.status === "ELIGIBLE",
    score: r.score,
    reasons: r.reasons,
    checks: { passed: r.passed, failed: r.failed, unknown: r.unknown },
    evaluatedAt: r.evaluatedAt,
  };
}

import type { ServerEvaluation } from "@/lib/live/evaluate-server";

/**
 * Response of the COMMS API for one eligibility decision.
 *
 *  - `eligibility` is primary: ELIGIBLE | INELIGIBLE | CONDITIONAL | UNKNOWN.
 *  - `checks.<id>`: the observed state the name describes — `tokenPaused: false` means the token is not paused. null = UNKNOWN (no evidence). Never guessed.
 *    Whether each state satisfies the policy is in `evidence[].result` (PASS | FAIL | UNKNOWN) and `summary`.
 *  - `evidence[]` carries the source, block, timestamp and confidence for every check where they can be established.
 *  - `score` is null unless the mode is demo: the score formula weights liquidity, and no live source can supply verified liquidity.
 */
export function toLiveApiResponse(ev: ServerEvaluation) {
  const r = ev.result;
  return {
    asset: ev.asset.address,
    symbol: ev.asset.symbol,
    name: ev.asset.name,
    registered: ev.asset.registered,
    eligibility: r.status,
    eligible: r.status === "ELIGIBLE",
    policy: r.policyId,
    reasons: r.reasons,
    checks: Object.fromEntries(r.checks.map((c) => [c.id, c.evidence.value])),
    summary: { passed: r.passed, failed: r.failed, unknown: r.unknown },
    evidence: r.checks.map((c) => ({
      check: c.id,
      result: c.result,
      required: c.required,
      value: c.evidence.value,
      source: c.evidence.source,
      network: c.evidence.network ?? null,
      contract: c.evidence.contract ?? null,
      blockNumber: c.evidence.blockNumber || null,
      timestamp: c.evidence.value === null ? null : c.evidence.timestamp,
      confidence: c.evidence.confidence,
      note: c.evidence.note ?? null,
    })),
    score: ev.mode === "demo" ? r.score : null,
    scoreNote: ev.mode === "demo" ? undefined : "NOT AVAILABLE — no verified liquidity source, so a score cannot be justified.",
    sources: ev.sources,
    degraded: ev.degraded,
    mode: ev.mode,
    evaluatedAt: r.evaluatedAt,
  };
}
