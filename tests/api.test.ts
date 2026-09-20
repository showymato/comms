import { describe, expect, it } from "vitest";
import { POLICIES } from "@/data/policies";
import { toLiveApiResponse } from "@/lib/api-shape";
import { evaluate } from "@/lib/engine";
import { unregisteredAsset } from "@/lib/live/evidence";
import { decodePolicyId, encodePolicyId, parsePolicyInput } from "@/lib/live/policy-codec";
import { formatUnits } from "@/lib/chain/events";
import type { ServerEvaluation } from "@/lib/live/evaluate-server";

const ADDR = "0x00000000000000000000000000000000000000aa";
const NOW = "2026-09-21T00:00:00.000Z";

describe("policy codec", () => {
  it("round-trips a policy through its stateless id", () => {
    const input = { minLiquidityUsd: 250_000, oracleRequired: true, transferRequired: false, redemptionRequired: true };
    const p = decodePolicyId(encodePolicyId(input));
    expect(p).toMatchObject(input);
  });
  it("rejects garbage ids and invalid bodies", () => {
    expect(decodePolicyId("c.not-base64-json")).toBeNull();
    expect(decodePolicyId("DEFAULT")).toBeNull();
    expect(typeof parsePolicyInput({ minLiquidityUsd: -1 })).toBe("string");
    expect(typeof parsePolicyInput({ minLiquidityUsd: 10, oracleRequired: "yes" })).toBe("string");
  });
});

describe("API response shape", () => {
  const asset = unregisteredAsset(ADDR, NOW);
  const result = evaluate(asset, POLICIES[0], NOW);
  const ev: ServerEvaluation = { mode: "live", result, asset: { symbol: asset.symbol, name: asset.name, address: asset.address, registered: false }, degraded: [], sources: [] };
  const body = toLiveApiResponse(ev);

  it("reports UNKNOWN, never a guessed pass, when there is no evidence", () => {
    expect(body.eligibility).toBe("UNKNOWN");
    expect(body.eligible).toBe(false);
    expect(Object.values(body.checks).every((v) => v === null)).toBe(true);
  });
  it("never invents evidence fields", () => {
    body.evidence.forEach((e) => {
      expect(e.confidence).toBeNull();
      expect(e.blockNumber).toBeNull();
      expect(e.timestamp).toBeNull();
    });
    expect(body.score).toBeNull();
  });
});

describe("token amounts", () => {
  it("formats 18-decimal units without float rounding", () => {
    expect(formatUnits("1500000000000000000", 18)).toBe("1.5");
    expect(formatUnits("123456789012345678901234", 18)).toBe("123,456.789");
    expect(formatUnits("5", null)).toBeNull();
  });
});
