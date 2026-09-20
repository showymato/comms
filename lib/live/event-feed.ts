/**
 * Unified real-event feed: onchain contract logs (Robinhood Chain RPC) + Robinhood corporate actions.
 * ASSET_STATUS_CHANGED / ELIGIBILITY_CHANGED are detected by diffing successive observations, which needs a persistent
 * store; until COMMS has one they are surfaced per browser session by the LiveDataManager, never invented here.
 */
import { scanEvents, formatUnits } from "@/lib/chain/events";
import { serverCache } from "@/lib/providers/serve";
import { cachedChain, cachedCorporateActions, cachedRegistry } from "@/lib/providers/server-data";
import type { RegistryAsset } from "@/types";

export type FeedType = "CORPORATE_ACTION" | "TRANSFER_RESTRICTION" | "CONTRACT_EVENT" | "ASSET_STATUS_CHANGED" | "ORACLE_CHANGE" | "ELIGIBILITY_CHANGED";

export interface FeedEvent {
  id: string;
  type: FeedType;
  /** the concrete thing that happened, e.g. "Transfer", "Paused", "CASH_DIVIDEND" */
  name: string;
  symbol: string | null;
  address: string | null;
  source: "ONCHAIN" | "ROBINHOOD";
  block: number | null;
  txHash: string | null;
  /** ISO. Onchain: block time. Corporate action: process date (UTC midnight). */
  timestamp: string | null;
  detail: string;
}

export interface FeedResult {
  events: FeedEvent[];
  range: { fromBlock: number; toBlock: number; scanned: number };
  /** provider lookups that failed — the affected event types are absent, not empty */
  degraded: Array<{ source: string; error: string }>;
}

export interface FeedQuery {
  types: FeedType[] | null;
  symbol: string | null;
  limit: number;
  /** blocks scanned back from head (max 20 000) */
  span: number;
  transfers: boolean;
}

const short = (a: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "?");

export async function buildFeed(q: FeedQuery): Promise<FeedResult> {
  const want = (t: FeedType) => q.types === null || q.types.includes(t);
  const degraded: FeedResult["degraded"] = [];
  const registry = await cachedRegistry();
  const byAddr = new Map<string, RegistryAsset>();
  registry.value.forEach((a) => a.deployments.forEach((d) => byAddr.set(d.contractAddress.toLowerCase(), a)));
  const events: FeedEvent[] = [];
  let range = { fromBlock: 0, toBlock: 0, scanned: 0 };

  if (want("CORPORATE_ACTION")) {
    try {
      const ca = await cachedCorporateActions();
      ca.value.forEach((a) =>
        events.push({
          id: `ca:${a.id}`,
          type: "CORPORATE_ACTION",
          name: a.type,
          symbol: a.tokenSymbol,
          address: a.deployments[0]?.contractAddress ?? null,
          source: "ROBINHOOD",
          block: null,
          txHash: null,
          timestamp: a.processDate ? `${a.processDate}T00:00:00.000Z` : null,
          detail: `${a.status.replace("_", " ")}${a.rate ? ` · rate ${a.rate}` : a.oldRate && a.newRate ? ` · ${a.oldRate} → ${a.newRate}` : ""}`,
        }),
      );
    } catch (e) {
      degraded.push({ source: "robinhood", error: e instanceof Error ? e.message : "corporate actions unavailable" });
    }
  }

  const wantChain = want("CONTRACT_EVENT") || want("TRANSFER_RESTRICTION");
  if (wantChain) {
    try {
      const head = await cachedChain();
      const addrs = registry.value.flatMap((a) => a.deployments.map((d) => d.contractAddress)).filter((a, i, arr) => arr.indexOf(a) === i);
      const span = Math.min(20_000, Math.max(100, q.span));
      const key = `chain:events:${span}:${q.transfers ? 1 : 0}:${Math.floor(head.value.block / 40)}`;
      const scan = await serverCache.get(key, () => scanEvents(addrs, head.value.block, { span, transfers: q.transfers, limit: 200 }), { ttlMs: 8000, staleMs: 120_000 });
      range = { fromBlock: scan.value.data.fromBlock, toBlock: scan.value.data.toBlock, scanned: scan.value.data.scanned };
      scan.value.data.events.forEach((e) => {
        const asset = byAddr.get(e.address.toLowerCase());
        const restriction = e.name === "Paused" || e.name === "Unpaused";
        const type: FeedType = restriction ? "TRANSFER_RESTRICTION" : "CONTRACT_EVENT";
        if (!want(type)) return;
        const amount = e.name === "Transfer" ? formatUnits(e.value, asset?.tokenDecimals ?? null) : null;
        events.push({
          id: `log:${e.txHash}:${e.logIndex}`,
          type,
          name: e.name,
          symbol: asset?.tokenSymbol ?? null,
          address: e.address,
          source: "ONCHAIN",
          block: e.block,
          txHash: e.txHash,
          timestamp: e.timestamp,
          detail: e.name === "Transfer" ? `${short(e.from)} → ${short(e.to)}${amount ? ` · ${amount}` : ""}` : e.name === "Paused" ? "Contract paused: transfers are halted" : e.name === "Unpaused" ? "Contract unpaused: transfers resumed" : e.name,
        });
      });
    } catch (e) {
      degraded.push({ source: "chain", error: e instanceof Error ? e.message : "chain logs unavailable" });
    }
  }

  const sym = q.symbol?.toUpperCase() ?? null;
  const out = events
    .filter((e) => (sym ? e.symbol === sym : true))
    .sort((a, b) => Date.parse(b.timestamp ?? "0") - Date.parse(a.timestamp ?? "0") || (b.block ?? 0) - (a.block ?? 0))
    .slice(0, q.limit);
  return { events: out, range, degraded };
}
