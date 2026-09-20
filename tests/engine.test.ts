import { describe, expect, it } from "vitest";
import { ASSETS, emptyAsset } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { CHECK_COUNT, evaluate } from "@/lib/engine";
import type { Asset, EligibilityStatus, Policy } from "@/types";

const DEFAULT = POLICIES[0];
const NOW = "2026-09-20T21:03:42Z";
const sym = (s: string) => ASSETS.find((a) => a.symbol === s)!;
const run = (a: Asset, p: Policy = DEFAULT) => evaluate(a, p, NOW);

describe("eligibility engine", () => {
  it("covers the nine checks from the spec", () => {
    expect(CHECK_COUNT).toBe(9);
  });

  it("ELIGIBLE: all checks pass and liquidity meets the minimum", () => {
    const r = run(sym("AAPL"));
    expect(r.status).toBe("ELIGIBLE");
    expect(r.reasons).toEqual(["ALL_CHECKS_PASSED"]);
    expect([r.passed, r.failed, r.unknown]).toEqual([9, 0, 0]);
  });

  it("CONDITIONAL: liquidity below the policy minimum, nothing else failing", () => {
    const r = run(sym("TSLA"));
    expect(r.status).toBe("CONDITIONAL");
    expect(r.reasons).toEqual(["LIQUIDITY_BELOW_MINIMUM"]);
    expect(r.failed).toBe(0);
  });

  it("INELIGIBLE: a required check fails, with its reason code", () => {
    expect(run(sym("NFLX")).reasons).toEqual(["TRANSFER_DISABLED"]);
    expect(run(sym("COIN")).reasons).toEqual(["TOKEN_PAUSED"]);
    expect(run(sym("DIS")).reasons).toEqual(["ISSUER_RESTRICTION"]);
    expect(run(sym("BA")).reasons).toEqual(["REDEMPTION_DISABLED"]);
    expect(run(sym("HOOD")).reasons).toEqual(["ORACLE_UNHEALTHY", "PRICE_STALE"]);
    for (const s of ["NFLX", "COIN", "DIS", "BA", "HOOD"]) expect(run(sym(s)).status).toBe("INELIGIBLE");
  });

  it("UNKNOWN: missing evidence is never guessed, and the score is withheld", () => {
    const r = run(sym("AMD"));
    expect(r.status).toBe("UNKNOWN");
    expect(r.reasons).toEqual(["INSUFFICIENT_EVIDENCE"]);
    expect(r.score).toBeNull();
    expect(r.unknown).toBe(2);
  });

  it("UNKNOWN: an address with no evidence at all", () => {
    const r = run(emptyAsset("0x00000000000000000000000000000000c0ffee01"));
    expect(r.status).toBe("UNKNOWN");
    expect(r.unknown).toBe(CHECK_COUNT);
  });

  it("a known hard failure outranks missing evidence", () => {
    const a = structuredClone(sym("AMD")) as Asset;
    a.state.paused.value = true;
    expect(run(a).status).toBe("INELIGIBLE");
  });

  it("is deterministic: same input, identical output", () => {
    expect(JSON.stringify(run(sym("TSLA")))).toBe(JSON.stringify(run(sym("TSLA"))));
  });

  it("policies change the answer without changing the evidence", () => {
    const flexible = POLICIES.find((p) => p.id === "FLEXIBLE")!;
    const institutional = POLICIES.find((p) => p.id === "INSTITUTIONAL")!;
    expect(run(sym("TSLA"), flexible).status).toBe("ELIGIBLE"); // 82k ≥ 25k
    expect(run(sym("AAPL"), institutional).status).toBe("ELIGIBLE"); // 4.21M ≥ 2M
    expect(run(sym("JPM"), institutional).status).toBe("CONDITIONAL"); // 1.48M < 2M
    // redemption not required by FLEXIBLE → BA (redemption disabled) is no longer decisive
    expect(run(sym("BA"), flexible).status).toBe("ELIGIBLE");
  });

  it("the registry exercises all four statuses", () => {
    const seen = new Set<EligibilityStatus>(ASSETS.map((a) => run(a).status));
    expect([...seen].sort()).toEqual(["CONDITIONAL", "ELIGIBLE", "INELIGIBLE", "UNKNOWN"]);
  });

  it("score is supplementary: an ineligible asset can still carry a high score", () => {
    const r = run(sym("NFLX"));
    expect(r.status).toBe("INELIGIBLE");
    expect(r.score).toBeGreaterThan(80);
  });
});
