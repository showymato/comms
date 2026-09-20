import type { Asset, AssetState, Evidence, EvidenceSource } from "@/types";
import { fakeAddress } from "@/lib/prng";
import { blockAgo, isoAgo } from "./reference";

const ev = <T = boolean>(value: T | null, source: EvidenceSource, ageSec: number, confidence = 1): Evidence<T> => ({
  value,
  source,
  blockNumber: blockAgo(ageSec),
  timestamp: isoAgo(ageSec),
  confidence,
});

type BoolField = keyof Omit<AssetState, "liquidityUsd">;

interface Spec {
  n: number;
  name: string;
  symbol: string;
  underlying: string;
  updated: number;
  liq: number | null;
  o?: Partial<Record<BoolField, boolean | null>>;
}

/** Healthy baseline; each asset overrides only what makes its scenario interesting. */
function build(s: Spec): Asset {
  const a = s.updated;
  const v = (k: BoolField, d: boolean): boolean | null => (s.o && k in s.o ? (s.o[k] ?? null) : d);
  const conf = (k: BoolField, c: number) => (v(k, true) === null ? 0 : c);
  const state: AssetState = {
    active: ev(v("active", true), "ONCHAIN", a + 40),
    transferEnabled: ev(v("transferEnabled", true), "ONCHAIN", a + 8),
    oracleHealthy: ev(v("oracleHealthy", true), "ORACLE", a + 3, conf("oracleHealthy", 0.99)),
    priceFresh: ev(v("priceFresh", true), "ORACLE", a + 3, conf("priceFresh", 0.99)),
    redemptionEnabled: ev(v("redemptionEnabled", true), "ISSUER", a + 60, 0.98),
    paused: ev(v("paused", false), "ONCHAIN", a + 8),
    transferRestricted: ev(v("transferRestricted", false), "ONCHAIN", a + 8),
    issuerRestricted: ev(v("issuerRestricted", false), "ISSUER", a + 120, 0.97),
    collateralSupported: ev(v("collateralSupported", true), "INDEXER", a + 15, conf("collateralSupported", 1)),
    liquidityUsd: ev<number>(s.liq, "INDEXER", a + 20, s.liq === null ? 0 : 0.95),
  };
  return {
    address: fakeAddress(s.n),
    name: s.name,
    symbol: s.symbol,
    underlying: s.underlying,
    network: "RH_CHAIN",
    updatedAgoSec: a,
    state,
  };
}

const SPECS: Spec[] = [
  { n: 1, name: "Apple Token", symbol: "AAPL", underlying: "Apple Inc.", updated: 12, liq: 4_210_000 },
  { n: 2, name: "Microsoft Token", symbol: "MSFT", underlying: "Microsoft Corp.", updated: 9, liq: 3_640_000 },
  { n: 3, name: "NVIDIA Token", symbol: "NVDA", underlying: "NVIDIA Corp.", updated: 17, liq: 5_120_000 },
  { n: 4, name: "Tesla Token", symbol: "TSLA", underlying: "Tesla, Inc.", updated: 31, liq: 82_000 },
  { n: 5, name: "Amazon Token", symbol: "AMZN", underlying: "Amazon.com, Inc.", updated: 22, liq: 2_380_000 },
  { n: 6, name: "Alphabet Token", symbol: "GOOGL", underlying: "Alphabet Inc.", updated: 44, liq: 2_910_000 },
  { n: 7, name: "Meta Token", symbol: "META", underlying: "Meta Platforms, Inc.", updated: 27, liq: 1_760_000 },
  { n: 8, name: "Netflix Token", symbol: "NFLX", underlying: "Netflix, Inc.", updated: 6, liq: 940_000, o: { transferEnabled: false } },
  { n: 9, name: "Coinbase Token", symbol: "COIN", underlying: "Coinbase Global, Inc.", updated: 53, liq: 611_000, o: { paused: true } },
  { n: 10, name: "AMD Token", symbol: "AMD", underlying: "Advanced Micro Devices, Inc.", updated: 78, liq: 1_120_000, o: { oracleHealthy: null, priceFresh: null } },
  { n: 11, name: "Palantir Token", symbol: "PLTR", underlying: "Palantir Technologies Inc.", updated: 35, liq: 64_000 },
  { n: 12, name: "JPMorgan Token", symbol: "JPM", underlying: "JPMorgan Chase & Co.", updated: 19, liq: 1_480_000 },
  { n: 13, name: "Disney Token", symbol: "DIS", underlying: "The Walt Disney Company", updated: 41, liq: 720_000, o: { issuerRestricted: true } },
  { n: 14, name: "Uber Token", symbol: "UBER", underlying: "Uber Technologies, Inc.", updated: 96, liq: null, o: { collateralSupported: null } },
  { n: 15, name: "Robinhood Token", symbol: "HOOD", underlying: "Robinhood Markets, Inc.", updated: 14, liq: 1_050_000, o: { oracleHealthy: false, priceFresh: false } },
  { n: 16, name: "Boeing Token", symbol: "BA", underlying: "The Boeing Company", updated: 62, liq: 388_000, o: { redemptionEnabled: false } },
];

export const ASSETS: readonly Asset[] = SPECS.map(build);

/** An address COMMS has no evidence for: every field is null, so the engine answers UNKNOWN — it never guesses. */
export function emptyAsset(address: string): Asset {
  const none = <T = boolean>(): Evidence<T> => ({ value: null, source: "INDEXER", blockNumber: 0, timestamp: isoAgo(0), confidence: 0 });
  return {
    address,
    name: "Unregistered token",
    symbol: "—",
    underlying: "—",
    network: "RH_CHAIN",
    updatedAgoSec: 0,
    state: {
      active: none(), transferEnabled: none(), oracleHealthy: none(), priceFresh: none(), redemptionEnabled: none(),
      paused: none(), transferRestricted: none(), issuerRestricted: none(), collateralSupported: none(), liquidityUsd: none<number>(),
    },
  };
}
