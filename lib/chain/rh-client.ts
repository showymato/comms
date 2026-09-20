/**
 * Minimal Robinhood Chain JSON-RPC client. Server-side only (the public RPC is not called from the browser,
 * and every call is cached by the route layer so we never poll it at high frequency).
 * Only functions COMMS actually needs are implemented.
 */
import { requestJson, type Timed } from "@/lib/data/request";
import { CHAIN_ID } from "@/lib/data/config";

export const RPC_URL = process.env.ROBINHOOD_RPC_URL || process.env.RH_CHAIN_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

interface RpcResponse<T> {
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

let seq = 1;

export async function rpcBatch(calls: Array<{ method: string; params: unknown[] }>): Promise<Timed<Array<RpcResponse<unknown>>>> {
  const body = calls.map((c) => ({ jsonrpc: "2.0", id: seq++, ...c }));
  const t = await requestJson<Array<RpcResponse<unknown>>>(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs: 8000,
    retries: 1,
  });
  // batch responses may come back out of order — match by id
  const byId = new Map(t.data.map((r) => [r.id, r]));
  return { data: body.map((b) => byId.get(b.id) ?? { id: b.id, error: { code: -1, message: "missing response" } }), latencyMs: t.latencyMs };
}

const hexToInt = (h: unknown) => (typeof h === "string" ? parseInt(h, 16) : NaN);

export interface BlockInfo {
  chainId: number;
  block: number;
  /** ISO */
  blockTime: string;
}

export async function getBlock(): Promise<Timed<BlockInfo>> {
  const { data, latencyMs } = await rpcBatch([
    { method: "eth_chainId", params: [] },
    { method: "eth_getBlockByNumber", params: ["latest", false] },
  ]);
  const chainId = hexToInt(data[0].result);
  const blk = data[1].result as { number?: string; timestamp?: string } | null | undefined;
  const block = hexToInt(blk?.number);
  const ts = hexToInt(blk?.timestamp);
  if (!Number.isFinite(chainId) || !Number.isFinite(block) || !Number.isFinite(ts)) throw new Error("Malformed block response");
  if (chainId !== CHAIN_ID) throw new Error(`Unexpected chain id ${chainId} (expected ${CHAIN_ID})`);
  return { data: { chainId, block, blockTime: new Date(ts * 1000).toISOString() }, latencyMs };
}

/** Decode an eth_call word as a strict bool. Anything else (revert, empty, non-0/1) → null: unknown, never guessed. */
export function decodeBool(word: unknown): boolean | null {
  if (typeof word !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(word)) return null;
  const v = BigInt(word);
  if (v === BigInt(0)) return false;
  if (v === BigInt(1)) return true;
  return null;
}

export function decodeString(data: unknown): string | null {
  if (typeof data !== "string" || data.length < 2 + 128) return null;
  try {
    const hex = data.slice(2);
    const len = parseInt(hex.slice(64, 128), 16);
    if (!Number.isFinite(len) || len < 0 || len > 256) return null;
    const bytes = hex.slice(128, 128 + len * 2).match(/../g) ?? [];
    return new TextDecoder().decode(Uint8Array.from(bytes.map((b) => parseInt(b, 16))));
  } catch {
    return null;
  }
}

export const decodeUint = (data: unknown): string | null =>
  typeof data === "string" && /^0x[0-9a-fA-F]{1,64}$/.test(data) ? BigInt(data).toString() : null;

export interface ContractProbe {
  address: string;
  /** block the reads were pinned to */
  block: number;
  blockTime: string;
  hasBytecode: boolean;
  bytecodeBytes: number;
  /** contains the beacon/upgradeable-proxy `implementation()` selector — a heuristic, not a verification */
  proxyLike: boolean;
  /** paused() result: true / false, or null if the contract has no readable paused() */
  paused: boolean | null;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupply: string | null;
}

/**
 * Read a Stock Token contract at one pinned block. Every field that can't be read stays null.
 * Reads: eth_getCode, paused(), name(), symbol(), decimals(), totalSupply().
 */
export async function inspectContract(address: string, at: BlockInfo): Promise<Timed<ContractProbe>> {
  const tag = `0x${at.block.toString(16)}`;
  const call = (data: string) => ({ method: "eth_call", params: [{ to: address, data }, tag] });
  const { data, latencyMs } = await rpcBatch([
    { method: "eth_getCode", params: [address, tag] },
    call("0x5c975abb"), // paused()
    call("0x06fdde03"), // name()
    call("0x95d89b41"), // symbol()
    call("0x313ce567"), // decimals()
    call("0x18160ddd"), // totalSupply()
  ]);
  const code = typeof data[0].result === "string" ? data[0].result : "0x";
  const dec = decodeUint(data[4].result);
  return {
    data: {
      address,
      block: at.block,
      blockTime: at.blockTime,
      hasBytecode: code.length > 2,
      bytecodeBytes: Math.max(0, (code.length - 2) / 2),
      proxyLike: code.includes("5c60da1b") || code.includes("360894a1"),
      paused: data[1].error ? null : decodeBool(data[1].result),
      name: data[2].error ? null : decodeString(data[2].result),
      symbol: data[3].error ? null : decodeString(data[3].result),
      decimals: dec === null ? null : Number(dec),
      totalSupply: data[5].error ? null : decodeUint(data[5].result),
    },
    latencyMs,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * paused() for many contracts, pinned to one block. The public RPC rate-limits large batches (HTTP 429 above
 * ~50 calls), so this sends small chunks with a pause between them and is meant to be cached for minutes.
 * A contract whose read reverts or errors maps to null (unknown) — never to false.
 */
export async function sweepPaused(addresses: string[], at: BlockInfo, chunk = 40): Promise<Timed<Record<string, boolean | null>>> {
  const tag = `0x${at.block.toString(16)}`;
  const out: Record<string, boolean | null> = {};
  let latencyMs = 0;
  for (let i = 0; i < addresses.length; i += chunk) {
    const part = addresses.slice(i, i + chunk);
    const { data, latencyMs: l } = await rpcBatch(part.map((to) => ({ method: "eth_call", params: [{ to, data: "0x5c975abb" }, tag] })));
    latencyMs += l;
    part.forEach((a, j) => {
      out[a.toLowerCase()] = data[j].error ? null : decodeBool(data[j].result);
    });
    if (i + chunk < addresses.length) await sleep(350);
  }
  return { data: out, latencyMs: Math.round(latencyMs / Math.max(1, Math.ceil(addresses.length / chunk))) };
}
