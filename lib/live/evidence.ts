/**
 * Live evidence builder. Pure: (registry row, quote, chain reads) → the `Asset` the deterministic engine evaluates.
 *
 * The rule of this file: a field is filled ONLY when a real source supplied it. Everything else is
 * `value: null` with source NONE and a reason — the engine then answers UNKNOWN. Nothing is inferred from a
 * different signal (a price existing does not make an oracle healthy; ERC-20 transfer() existing does not
 * make transfers enabled).
 */
import type { Asset, AssetState, Evidence, LiveAssetMeta, PriceSnapshot, RegistryAsset } from "@/types";
import { CHAIN_ID, CHAIN_NAME, FRESHNESS } from "@/lib/data/config";

export interface ContractReads {
  block: number;
  /** ISO — block timestamp */
  blockTime: string;
  paused: boolean | null;
  hasBytecode: boolean | null;
}

export interface LiveInputs {
  registry: RegistryAsset;
  price: PriceSnapshot | null;
  contract: ContractReads | null;
  /** ISO — when the registry was fetched */
  registryFetchedAt: string;
  /** epoch ms "now" — injected so the function stays pure */
  now: number;
}

export const primaryDeployment = (r: RegistryAsset) => r.deployments.find((d) => d.chainId === CHAIN_ID) ?? r.deployments[0] ?? null;

const none = <T = boolean>(note: string, at: string): Evidence<T> => ({
  value: null,
  source: "NONE",
  blockNumber: 0,
  timestamp: at,
  confidence: null,
  note,
});

export const NOTES = {
  transfer: "No verified transfer-state evidence: the token contract exposes no readable transfer switch COMMS can verify.",
  oracle: "No onchain oracle or price feed has been verified for this token. A Robinhood quote existing does not make an oracle healthy.",
  redemption: "No authoritative source for redemption state is available.",
  restricted: "No verified onchain restriction registry is available for this token.",
  issuer: "No verified issuer-restriction feed is available.",
  collateral: "Collateral support is protocol-specific; no verified source lists this token as supported.",
  liquidity: "No trustworthy liquidity or market-depth source. Reported trading volume is not onchain liquidity.",
  paused: "paused() could not be read from the contract (no such function, or the RPC read failed).",
  chainPending: "Contract state has not been read yet.",
  price: "No usable quote from the Robinhood price API.",
} as const;

/** Freshness of the quote at `now`, in seconds; null when there is no quote. */
export const quoteAgeSec = (p: PriceSnapshot | null, now: number): number | null =>
  p ? Math.max(0, (now - Date.parse(p.generatedAt)) / 1000) : null;

export function buildLiveAsset({ registry, price, contract, registryFetchedAt, now }: LiveInputs): Asset {
  const dep = primaryDeployment(registry);
  const address = dep?.contractAddress ?? registry.id;
  const fetchedAt = registryFetchedAt;
  const onchain = (value: boolean | null, note: string): Evidence => ({
    value,
    source: "ONCHAIN",
    blockNumber: contract?.block ?? 0,
    timestamp: contract?.blockTime ?? fetchedAt,
    confidence: null,
    contract: address,
    network: CHAIN_NAME,
    note,
  });

  const active: Evidence =
    registry.status === "UNKNOWN"
      ? none("Robinhood registry reported an unrecognised status.", fetchedAt)
      : {
          value: registry.status === "ACTIVE",
          source: "ROBINHOOD",
          blockNumber: 0,
          timestamp: fetchedAt,
          confidence: null,
          note: `Robinhood /assets status = ${registry.rawStatus}`,
        };

  const age = quoteAgeSec(price, now);
  const priceFresh: Evidence =
    price === null || age === null
      ? none(NOTES.price, fetchedAt)
      : {
          value: age <= FRESHNESS.price.stale,
          source: "ROBINHOOD",
          blockNumber: 0,
          timestamp: price.generatedAt,
          confidence: null,
          note: `Quote generated ${Math.round(age)}s before evaluation; freshness window ${FRESHNESS.price.stale}s.`,
        };

  const paused: Evidence =
    contract && contract.paused !== null
      ? onchain(contract.paused, `paused() at block ${contract.block.toLocaleString("en-US")}`)
      : none(contract ? NOTES.paused : NOTES.chainPending, contract?.blockTime ?? fetchedAt);

  const state: AssetState = {
    active,
    transferEnabled: none(NOTES.transfer, fetchedAt),
    oracleHealthy: none(NOTES.oracle, fetchedAt),
    priceFresh,
    redemptionEnabled: none(NOTES.redemption, fetchedAt),
    paused,
    transferRestricted: none(NOTES.restricted, fetchedAt),
    issuerRestricted: none(NOTES.issuer, fetchedAt),
    collateralSupported: none(NOTES.collateral, fetchedAt),
    liquidityUsd: none<number>(NOTES.liquidity, fetchedAt),
  };

  const live: LiveAssetMeta = {
    registryId: registry.id,
    tokenName: registry.tokenName,
    logoUrl: registry.logoUrl,
    lifecycle: registry.status,
    rawStatus: registry.rawStatus,
    multiplier: registry.currentMultiplier,
    pendingMultiplier: registry.pendingMultiplier,
    pendingMultiplierEffectiveTime: registry.pendingMultiplierEffectiveTime,
    trading: registry.tradingCapabilities,
    price,
    isin: registry.isin,
    decimals: registry.tokenDecimals,
    registryFetchedAt,
    hasBytecode: contract?.hasBytecode ?? null,
  };

  return {
    address,
    name: registry.tokenName.replace(/\s*•\s*Robinhood Token$/i, ""),
    symbol: registry.tokenSymbol,
    underlying: registry.tokenSymbol,
    network: "RH_CHAIN",
    updatedAgoSec: Math.max(0, Math.round((now - Date.parse(fetchedAt)) / 1000)),
    state,
    live,
  };
}

/** An address with no registry entry: every field UNKNOWN. The engine answers UNKNOWN / INSUFFICIENT_EVIDENCE. */
export function unregisteredAsset(address: string, at: string): Asset {
  const n = (note: string) => none(note, at);
  const why = "Address is not in the Robinhood Stock Token registry.";
  return {
    address,
    name: "Unregistered token",
    symbol: "—",
    underlying: "—",
    network: "RH_CHAIN",
    updatedAgoSec: 0,
    state: {
      active: n(why),
      transferEnabled: n(why),
      oracleHealthy: n(why),
      priceFresh: n(why),
      redemptionEnabled: n(why),
      paused: n(why),
      transferRestricted: n(why),
      issuerRestricted: n(why),
      collateralSupported: n(why),
      liquidityUsd: none<number>(why, at),
    },
  };
}

/**
 * Hybrid mode only: fill the checks no live source can supply with values explicitly marked DEMO, so
 * eligible / conditional outcomes can be shown. Every filled field carries source DEMO — the UI badges it.
 * Values are fixed (no randomness): the hybrid asset is deterministic.
 */
export function withDemoGaps(asset: Asset, now: number): Asset {
  const at = new Date(now).toISOString();
  const demo = <T = boolean>(value: T): Evidence<T> => ({
    value,
    source: "DEMO",
    blockNumber: 0,
    timestamp: at,
    confidence: null,
    note: "DEMO DATA — hybrid mode fills checks that no live source can verify.",
  });
  const s = asset.state;
  const fill = <T,>(e: Evidence<T>, v: T): Evidence<T> => (e.value === null ? demo(v) : e);
  return {
    ...asset,
    state: {
      ...s,
      transferEnabled: fill(s.transferEnabled, true),
      oracleHealthy: fill(s.oracleHealthy, true),
      redemptionEnabled: fill(s.redemptionEnabled, true),
      transferRestricted: fill(s.transferRestricted, false),
      issuerRestricted: fill(s.issuerRestricted, false),
      collateralSupported: fill(s.collateralSupported, true),
      liquidityUsd: fill<number>(s.liquidityUsd, 250_000),
    },
  };
}

/** Token-equivalent price: raw underlying quote × currentMultiplier (Stock Token multiplier). Kept separate from the raw quote. */
export function tokenEquivalent(raw: number, multiplier: string): number | null {
  const m = Number(multiplier);
  return Number.isFinite(m) && m > 0 ? raw * m : null;
}
