/**
 * Real Robinhood Chain events for the Stock Token contracts, read with eth_getLogs. Server-side only.
 *
 *  • Lifecycle logs (Paused / Unpaused / Upgraded / OwnershipTransferred) — rare, and the ones that change eligibility.
 *  • Transfer logs — opt-in: they prove the feed is live, but do not by themselves change eligibility.
 *
 * Nothing here is generated: an empty result means no such log was emitted in the scanned block range.
 */
import type { Timed } from "@/lib/data/request";
import { rpcBatch } from "./rh-client";

export const TOPICS = {
  Paused: "0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258",
  Unpaused: "0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa",
  Upgraded: "0xbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b",
  OwnershipTransferred: "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
  Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
} as const;

export type LogName = keyof typeof TOPICS;
const NAME_BY_TOPIC = Object.fromEntries(Object.entries(TOPICS).map(([k, v]) => [v, k])) as Record<string, LogName>;
const LIFECYCLE = [TOPICS.Paused, TOPICS.Unpaused, TOPICS.Upgraded, TOPICS.OwnershipTransferred];

export interface RawEvent {
  name: LogName;
  address: string;
  block: number;
  logIndex: number;
  txHash: string;
  /** ISO — block timestamp, null if it could not be read */
  timestamp: string | null;
  from: string | null;
  to: string | null;
  /** raw uint256 (Transfer) as a decimal string */
  value: string | null;
}

interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

const hex = (h: string) => parseInt(h, 16);
const topicAddr = (t: string | undefined) => (t && t.length === 66 ? `0x${t.slice(26)}` : null);

async function logs(addresses: string[], from: number, topics: Array<string | string[]>): Promise<{ list: Log[]; latencyMs: number }> {
  const { data, latencyMs } = await rpcBatch([{ method: "eth_getLogs", params: [{ fromBlock: `0x${from.toString(16)}`, toBlock: "latest", address: addresses, topics }] }]);
  if (data[0].error) throw new Error(`eth_getLogs: ${data[0].error.message}`);
  return { list: (data[0].result as Log[] | undefined) ?? [], latencyMs };
}

async function blockTimes(blocks: number[]): Promise<{ times: Map<number, string>; latencyMs: number }> {
  const times = new Map<number, string>();
  let latencyMs = 0;
  for (let i = 0; i < blocks.length; i += 40) {
    const part = blocks.slice(i, i + 40);
    const { data, latencyMs: l } = await rpcBatch(part.map((b) => ({ method: "eth_getBlockByNumber", params: [`0x${b.toString(16)}`, false] })));
    latencyMs += l;
    part.forEach((b, j) => {
      const ts = (data[j].result as { timestamp?: string } | null | undefined)?.timestamp;
      if (ts) times.set(b, new Date(hex(ts) * 1000).toISOString());
    });
  }
  return { times, latencyMs };
}

export interface EventScan {
  events: RawEvent[];
  fromBlock: number;
  toBlock: number;
  scanned: number;
}

/** Most recent events (newest first) across the given contracts. `span` is the number of blocks scanned back from `head`. */
export async function scanEvents(addresses: string[], head: number, opts: { span: number; transfers: boolean; limit: number }): Promise<Timed<EventScan>> {
  const from = Math.max(0, head - opts.span);
  const [life, xfer] = await Promise.all([logs(addresses, from, [LIFECYCLE]), opts.transfers ? logs(addresses, from, [TOPICS.Transfer]) : Promise.resolve({ list: [] as Log[], latencyMs: 0 })]);
  const all = [...life.list, ...xfer.list].sort((a, b) => hex(b.blockNumber) - hex(a.blockNumber) || hex(b.logIndex) - hex(a.logIndex));
  const picked = all.slice(0, opts.limit);
  const { times, latencyMs: bl } = await blockTimes([...new Set(picked.map((l) => hex(l.blockNumber)))]);
  const events: RawEvent[] = picked.map((l) => {
    const name = NAME_BY_TOPIC[l.topics[0]] ?? "Transfer";
    return {
      name,
      address: l.address,
      block: hex(l.blockNumber),
      logIndex: hex(l.logIndex),
      txHash: l.transactionHash,
      timestamp: times.get(hex(l.blockNumber)) ?? null,
      from: name === "Transfer" ? topicAddr(l.topics[1]) : null,
      to: name === "Transfer" ? topicAddr(l.topics[2]) : null,
      value: name === "Transfer" && /^0x[0-9a-fA-F]{1,64}$/.test(l.data) ? BigInt(l.data).toString() : null,
    };
  });
  return { data: { events, fromBlock: from, toBlock: head, scanned: all.length }, latencyMs: Math.max(life.latencyMs, xfer.latencyMs) + bl };
}

/** 18-decimal token amount → "1,234.5678" without float rounding. */
export function formatUnits(raw: string | null, decimals: number | null): string | null {
  if (raw === null || decimals === null) return null;
  const v = BigInt(raw);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
  return `${whole.toLocaleString("en-US")}${frac ? `.${frac}` : ""}`;
}
