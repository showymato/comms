import { describe, expect, it } from "vitest";
import { decodeBool, decodeString } from "@/lib/chain/rh-client";
import { SwrCache } from "@/lib/data/cache";
import { evaluate } from "@/lib/engine";
import { POLICIES } from "@/data/policies";
import { buildLiveAsset, tokenEquivalent, unregisteredAsset, withDemoGaps } from "@/lib/live/evidence";
import { normalizeAsset, normalizeAssets, normalizeCorporateAction, normalizeQuote } from "@/lib/providers/normalize";
import { freshnessOf } from "@/lib/data/config";

const rawAsset = {
  id: "0x01",
  tokenSymbol: "AAPL",
  tokenName: "Apple • Robinhood Token",
  deployments: [{ contractAddress: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", chainId: 4663, networkName: "Robinhood Chain" }],
  currentMultiplier: "1.000000000000000000",
  pendingMultiplier: "",
  status: "ASSET_STATUS_ACTIVE",
  logoUrl: "https://example.test/x.png",
  tradingCapabilities: { market: { whole: "TRADING_STATUS_TRADABLE", fractional: "TRADING_STATUS_UNTRADABLE" } },
  tokenDecimals: 18,
  isin: "US0378331005",
};
const NOW = Date.parse("2026-09-20T18:00:00Z");
const registry = normalizeAsset(rawAsset)!;
const quote = normalizeQuote({ tokenSymbol: "AAPL", bid: "334.76", ask: "334.94", currency: "USD", dailyTradingVolume: "86588048", isTradingHalt: false, generatedAt: "2026-09-20T17:59:30Z" }, "2026-09-20T18:00:00Z");

describe("normalizers", () => {
  it("maps API enums without inventing values", () => {
    expect(registry.status).toBe("ACTIVE");
    expect(registry.pendingMultiplier).toBeNull();
    expect(registry.tradingCapabilities.market).toEqual({ whole: "TRADABLE", fractional: "UNTRADABLE" });
    // absent sessions are UNKNOWN, not TRADABLE
    expect(registry.tradingCapabilities.overnight).toEqual({ whole: "UNKNOWN", fractional: "UNKNOWN" });
    expect(normalizeAsset({ ...rawAsset, status: "ASSET_STATUS_INACTIVE" })!.status).toBe("INACTIVE");
    expect(normalizeAsset({ ...rawAsset, status: "something-new" })!.status).toBe("UNKNOWN");
  });

  it("drops malformed rows instead of defaulting them", () => {
    expect(normalizeAssets({ assets: [rawAsset, { tokenSymbol: "X" }, null, 7] })).toHaveLength(1);
    expect(normalizeAssets({})).toEqual([]);
  });

  it("computes mid, spread and rejects unusable quotes", () => {
    expect(quote!.mid).toBeCloseTo(334.85);
    expect(quote!.spread).toBeCloseTo(0.18);
    expect(normalizeQuote({ tokenSymbol: "A", bid: "10", ask: "9", generatedAt: "x" }, "y")).toBeNull(); // crossed
    expect(normalizeQuote({ tokenSymbol: "A", bid: "n/a", ask: "9", generatedAt: "x" }, "y")).toBeNull();
    expect(normalizeQuote({ tokenSymbol: "A", bid: "1", ask: "2" }, "y")).toBeNull(); // no generatedAt
  });

  it("normalizes corporate actions and keeps raw details", () => {
    const a = normalizeCorporateAction({
      id: "0x1",
      type: "CORPORATE_ACTION_TYPE_CASH_DIVIDEND",
      status: "CORPORATE_ACTION_STATUS_IN_PROGRESS",
      processDate: { year: 2026, month: 9, day: 5 },
      tokenSymbol: "XLK",
      deployments: [],
      details: { cashDividend: { underlyingSymbol: "XLK", rate: "0.22" } },
    })!;
    expect(a.type).toBe("CASH_DIVIDEND");
    expect(a.processDate).toBe("2026-09-05");
    expect(a.rate).toBe("0.22");
    expect(a.underlyingSymbol).toBe("XLK");
    expect(normalizeCorporateAction({ id: "1", tokenSymbol: "X", type: "CORPORATE_ACTION_TYPE_NEW_THING" })!.type).toBe("OTHER");
  });
});

describe("chain decoding", () => {
  it("decodes only a strict bool word", () => {
    expect(decodeBool("0x" + "0".repeat(64))).toBe(false);
    expect(decodeBool("0x" + "0".repeat(63) + "1")).toBe(true);
    expect(decodeBool("0x" + "0".repeat(63) + "2")).toBeNull();
    expect(decodeBool("0x")).toBeNull();
    expect(decodeBool(undefined)).toBeNull();
  });
  it("decodes an ABI string", () => {
    const data = "0x" + "20".padStart(64, "0") + "4".padStart(64, "0") + "4141504c".padEnd(64, "0");
    expect(decodeString(data)).toBe("AAPL");
    expect(decodeString("0x")).toBeNull();
  });
});

describe("live evidence → engine (UNKNOWN is correct)", () => {
  const contract = { block: 100, blockTime: "2026-09-20T17:59:59Z", paused: false, hasBytecode: null };
  const build = (over: Partial<Parameters<typeof buildLiveAsset>[0]> = {}) =>
    buildLiveAsset({ registry, price: quote, contract, registryFetchedAt: "2026-09-20T17:59:00Z", now: NOW, ...over });

  it("never marks unverifiable checks as passing", () => {
    const r = evaluate(build(), POLICIES[0], "t");
    const by = (id: string) => r.checks.find((c) => c.id === id)!;
    expect(by("assetActive").result).toBe("PASS");
    expect(by("assetActive").evidence.source).toBe("ROBINHOOD");
    expect(by("tokenPaused").result).toBe("PASS");
    expect(by("tokenPaused").evidence).toMatchObject({ source: "ONCHAIN", blockNumber: 100 });
    // a price existing must not make the oracle healthy
    expect(by("oracleHealthy").result).toBe("UNKNOWN");
    expect(by("oracleHealthy").evidence.source).toBe("NONE");
    for (const id of ["transferEnabled", "redemptionEnabled", "transferRestricted", "issuerRestriction", "collateralSupported"]) expect(by(id).result).toBe("UNKNOWN");
    expect(r.status).toBe("UNKNOWN");
    expect(r.liquidity.value).toBeNull();
  });

  it("does not invent confidence", () => {
    const r = evaluate(build(), POLICIES[0], "t");
    expect(r.checks.every((c) => c.evidence.confidence === null)).toBe(true);
  });

  it("an unreadable paused() is UNKNOWN, never false", () => {
    const r = evaluate(build({ contract: { ...contract, paused: null } }), POLICIES[0], "t");
    expect(r.checks.find((c) => c.id === "tokenPaused")!.result).toBe("UNKNOWN");
  });

  it("a contract that is paused makes the asset INELIGIBLE regardless of missing evidence", () => {
    const r = evaluate(build({ contract: { ...contract, paused: true } }), POLICIES[0], "t");
    expect(r.status).toBe("INELIGIBLE");
    expect(r.reasons).toContain("TOKEN_PAUSED");
  });

  it("an inactive registry status fails the asset", () => {
    const inactive = normalizeAsset({ ...rawAsset, status: "ASSET_STATUS_INACTIVE" })!;
    expect(evaluate(build({ registry: inactive }), POLICIES[0], "t").status).toBe("INELIGIBLE");
  });

  it("no chain read yet → paused is UNKNOWN with a reason", () => {
    const a = build({ contract: null });
    expect(a.state.paused.value).toBeNull();
    expect(a.state.paused.note).toMatch(/not been read/i);
  });

  it("a stale quote fails price freshness; no quote is UNKNOWN", () => {
    const old = normalizeQuote({ tokenSymbol: "AAPL", bid: "1", ask: "2", generatedAt: "2026-09-20T17:00:00Z" }, "x");
    expect(build({ price: old }).state.priceFresh.value).toBe(false);
    expect(build({ price: null }).state.priceFresh.value).toBeNull();
  });

  it("an unregistered address is UNKNOWN / INSUFFICIENT_EVIDENCE", () => {
    const r = evaluate(unregisteredAsset("0x00000000000000000000000000000000c0ffee01", "t"), POLICIES[0], "t");
    expect(r.status).toBe("UNKNOWN");
    expect(r.reasons).toEqual(["INSUFFICIENT_EVIDENCE"]);
  });

  it("hybrid fills only the gaps, all marked DEMO, and never touches real evidence", () => {
    const real = build();
    const h = withDemoGaps(real, NOW);
    expect(h.state.active).toBe(real.state.active);
    expect(h.state.paused).toBe(real.state.paused);
    expect(h.state.transferEnabled.source).toBe("DEMO");
    expect(h.state.liquidityUsd.source).toBe("DEMO");
    expect(evaluate(h, POLICIES[0], "t").status).toBe("ELIGIBLE");
  });

  it("token-equivalent price applies the multiplier and is null on a bad one", () => {
    expect(tokenEquivalent(100, "1.5")).toBeCloseTo(150);
    expect(tokenEquivalent(100, "abc")).toBeNull();
  });
});

describe("cache & freshness", () => {
  it("dedupes concurrent fetches and serves stale on failure", async () => {
    const c = new SwrCache();
    let calls = 0;
    const f = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return calls;
    };
    const [a, b] = await Promise.all([c.get("k", f, { ttlMs: 1000 }), c.get("k", f, { ttlMs: 1000 })]);
    expect(calls).toBe(1);
    expect(a.value).toBe(b.value);

    const bad = new SwrCache();
    bad.set("k", "last-good", Date.now() - 5000);
    const r = await bad.get("k", async () => Promise.reject(new Error("down")), { ttlMs: 1000, staleMs: 1 });
    expect(r.value).toBe("last-good");
    expect(r.stale).toBe(true);
    expect(r.error).toBeInstanceOf(Error);

    await expect(new SwrCache().get("none", async () => Promise.reject(new Error("down")), { ttlMs: 1 })).rejects.toThrow("down");
  });

  it("classifies freshness", () => {
    const t = { fresh: 45, stale: 300 };
    expect(freshnessOf(3, t)).toBe("FRESH");
    expect(freshnessOf(120, t)).toBe("AGING");
    expect(freshnessOf(900, t)).toBe("STALE");
    expect(freshnessOf(null, t)).toBe("UNKNOWN");
  });
});

import { sliceHealth, type Slice } from "@/lib/data/live-manager";

describe("LIVE label rule (never LIVE unless fresh and successful)", () => {
  const now = 1_000_000_000_000;
  const mk = (over: Partial<Slice<number>>): Slice<number> => ({ data: 1, fetchedAt: now, loading: false, error: null, latencyMs: 10, lastOkAt: now, ...over });
  it("connecting / offline with no data", () => {
    expect(sliceHealth(mk({ data: null, fetchedAt: null }), "price", now)).toBe("CONNECTING");
    expect(sliceHealth(mk({ data: null, fetchedAt: null, error: "x" }), "price", now)).toBe("OFFLINE");
  });
  it("LIVE only when fresh", () => {
    expect(sliceHealth(mk({ fetchedAt: now - 5_000 }), "price", now)).toBe("LIVE");
    expect(sliceHealth(mk({ fetchedAt: now - 120_000 }), "price", now)).toBe("LAST_KNOWN");
    expect(sliceHealth(mk({ fetchedAt: now - 900_000 }), "price", now)).toBe("STALE");
  });
  it("a failed refresh is DEGRADED (or STALE) — the last value stays, flagged", () => {
    expect(sliceHealth(mk({ fetchedAt: now - 5_000, error: "timeout" }), "price", now)).toBe("DEGRADED");
    expect(sliceHealth(mk({ fetchedAt: now - 900_000, error: "timeout" }), "price", now)).toBe("STALE");
  });
});
