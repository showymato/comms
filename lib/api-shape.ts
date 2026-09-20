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
