"use client";

import { useMemo } from "react";
import { useAssets } from "@/hooks/use-live";
import { evaluate, CHECK_SPECS } from "@/lib/engine";
import { POLICIES } from "@/data/policies";
import type { Asset, CheckId, CheckResult, EligibilityResult, EligibilityStatus, Policy } from "@/types";

export interface CheckCoverage {
  id: CheckId;
  label: string;
  pass: number;
  fail: number;
  unknown: number;
  /** distinct evidence sources that actually supplied a value for this check */
  sources: string[];
}

export interface Evaluated {
  loading: boolean;
  error: string | null;
  assets: Asset[];
  results: EligibilityResult[];
  counts: Record<EligibilityStatus, number>;
  coverage: CheckCoverage[];
  active: number | null;
  inactive: number | null;
  policy: Policy;
}

const ZERO: Record<EligibilityStatus, number> = { ELIGIBLE: 0, INELIGIBLE: 0, CONDITIONAL: 0, UNKNOWN: 0 };

/**
 * Every real registry asset, run through the deterministic engine under one policy (DEFAULT unless given).
 * All the marketing and dashboard numbers come from this one derivation — nothing is hardcoded.
 */
export function useEvaluated(policy: Policy = POLICIES[0]): Evaluated {
  const { assets, loading, error, evaluatedAt } = useAssets();
  return useMemo(() => {
    const at = new Date(evaluatedAt ?? 0).toISOString();
    const results = assets.map((a) => evaluate(a, policy, at));
    const counts = { ...ZERO };
    results.forEach((r) => (counts[r.status] += 1));
    const coverage: CheckCoverage[] = CHECK_SPECS.map((spec, i) => {
      const tally: Record<CheckResult, number> = { PASS: 0, FAIL: 0, UNKNOWN: 0 };
      const sources = new Set<string>();
      results.forEach((r) => {
        const c = r.checks[i];
        tally[c.result] += 1;
        if (c.result !== "UNKNOWN") sources.add(c.evidence.source);
      });
      return { id: spec.id, label: spec.label, pass: tally.PASS, fail: tally.FAIL, unknown: tally.UNKNOWN, sources: [...sources] };
    });
    const known = assets.filter((a) => a.live);
    return {
      loading,
      error,
      assets,
      results,
      counts,
      coverage,
      active: known.length ? known.filter((a) => a.live?.lifecycle === "ACTIVE").length : null,
      inactive: known.length ? known.filter((a) => a.live?.lifecycle === "INACTIVE").length : null,
      policy,
    };
  }, [assets, loading, error, evaluatedAt, policy]);
}
