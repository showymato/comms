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
 * Response of the live COMMS API. The status is primary. `score` is null unless the mode is demo: the engine's score
 * formula weights liquidity, and no live source can supply verified liquidity, so a number would be unjustified.
 */
export function toLiveApiResponse(ev: ServerEvaluation) {
  const r = ev.result;
  return {
    mode: ev.mode,
    asset: ev.asset,
    policy: r.policyId,
    status: r.status,
    eligible: r.status === "ELIGIBLE",
    score: ev.mode === "demo" ? r.score : null,
    scoreNote: ev.mode === "demo" ? undefined : "NOT AVAILABLE — no verified liquidity source, so a score cannot be justified.",
    reasons: r.reasons,
    checks: { passed: r.passed, failed: r.failed, unknown: r.unknown },
    checkDetail: r.checks.map((c) => ({
      type: c.id,
      result: c.result,
      required: c.required,
      source: c.evidence.source,
      timestamp: c.evidence.timestamp,
      evidence: {
        value: c.evidence.value,
        blockNumber: c.evidence.blockNumber || null,
        contract: c.evidence.contract ?? null,
        network: c.evidence.network ?? null,
        confidence: c.evidence.confidence,
        note: c.evidence.note ?? null,
      },
    })),
    sources: ev.sources,
    degraded: ev.degraded,
    evaluatedAt: r.evaluatedAt,
  };
}
