/**
 * Server-side cached accessors shared by every route handler. One cache key per upstream resource, so
 * /api/assets, /api/eligibility/check, /api/status … all hit the same cached value and the same in-flight request.
 */
import { SERVER_TTL } from "@/lib/data/config";
import type { Timed } from "@/lib/data/request";
import type { ChainState, CorporateAction, PriceSnapshot, RegistryAsset } from "@/types";
import * as blockscout from "./blockscout";
import * as robinhood from "./robinhood";
import * as chain from "./robinhoodChain";
import { sweepPaused } from "@/lib/chain/rh-client";
import { serverCache } from "./serve";

export const KEYS = {
  registry: "rh:assets",
  prices: "rh:prices",
  corporateActions: "rh:corp-actions",
  chain: "chain:block",
  paused: "chain:paused",
  price: (s: string) => `rh:price:${s}`,
  contract: (a: string) => `chain:contract:${a.toLowerCase()}`,
  explorer: (a: string) => `blockscout:contract:${a.toLowerCase()}`,
} as const;

export const fetchers = {
  registry: () => robinhood.getAssets(),
  prices: () => robinhood.getAllPrices(),
  corporateActions: () => robinhood.getCorporateActions(),
  chain: () => chain.getChainState(),
  price: (symbol: string) => () => robinhood.getPrice(symbol),
  paused: async (): Promise<Timed<PausedSweep>> => {
    const [reg, blk] = await Promise.all([cachedRegistry(), cachedChain()]);
    const addrs = reg.value.map((a) => a.deployments[0]?.contractAddress).filter((a): a is string => Boolean(a));
    const t = await sweepPaused(addrs, blk.value);
    return { data: { block: blk.value.block, blockTime: blk.value.blockTime, paused: t.data }, latencyMs: t.latencyMs };
  },
  contract: (address: string) => async (): Promise<Timed<chain.ContractProbe>> => {
    const blk = await cachedChain();
    return chain.getContractState(address, blk.value);
  },
  explorer: (address: string) => () => blockscout.getContractMeta(address),
};

export interface PausedSweep {
  block: number;
  blockTime: string;
  /** lowercase address → paused() result; null = unreadable */
  paused: Record<string, boolean | null>;
}

interface Hit<T> {
  value: T;
  at: number;
  latencyMs: number | null;
  stale: boolean;
}

async function via<T>(key: string, ttlSec: number, f: () => Promise<Timed<T>>): Promise<Hit<T>> {
  const r = await serverCache.get(key, f, { ttlMs: ttlSec * 1000, staleMs: ttlSec * 20_000 });
  return { value: r.value.data, at: r.at, latencyMs: r.value.latencyMs, stale: r.stale };
}

export const cachedRegistry = () => via<RegistryAsset[]>(KEYS.registry, SERVER_TTL.registry, fetchers.registry);
export const cachedPrices = () => via<PriceSnapshot[]>(KEYS.prices, SERVER_TTL.prices, fetchers.prices);
export const cachedPrice = (symbol: string) => via<PriceSnapshot | null>(KEYS.price(symbol), SERVER_TTL.prices, fetchers.price(symbol));
export const cachedCorporateActions = () => via<CorporateAction[]>(KEYS.corporateActions, SERVER_TTL.corporateActions, fetchers.corporateActions);
export const cachedChain = () => via<ChainState>(KEYS.chain, SERVER_TTL.chain, fetchers.chain);
export const cachedContract = (address: string) => via<chain.ContractProbe>(KEYS.contract(address), SERVER_TTL.contract, fetchers.contract(address));

/** Resolve an address-or-symbol to a registry row. Addresses match case-insensitively. */
export async function resolveAsset(idOrSymbol: string): Promise<RegistryAsset | null> {
  const { value } = await cachedRegistry();
  const q = idOrSymbol.trim();
  const lower = q.toLowerCase();
  return (
    value.find((a) => a.deployments.some((d) => d.contractAddress.toLowerCase() === lower)) ??
    value.find((a) => a.tokenSymbol === q.toUpperCase()) ??
    null
  );
}
