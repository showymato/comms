/** Robinhood Chain (id 4663) — ONCHAIN source of truth. Thin, normalized wrapper over rh-client. */
import { getBlock, inspectContract, type BlockInfo, type ContractProbe } from "@/lib/chain/rh-client";
import type { Timed } from "@/lib/data/request";
import type { ChainState } from "@/types";

export type { BlockInfo, ContractProbe };

export async function getChainState(): Promise<Timed<ChainState>> {
  const t = await getBlock();
  return { data: { ...t.data, fetchedAt: new Date().toISOString() }, latencyMs: t.latencyMs };
}

export const getContractState = inspectContract;
