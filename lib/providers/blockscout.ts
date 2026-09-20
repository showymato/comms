/**
 * Blockscout public explorer API — evidence ENRICHMENT only (contract verification metadata).
 * Never authoritative: onchain RPC reads win. If the explorer is unreachable or challenges the request
 * we report that honestly and verification stays UNKNOWN.
 */
import { HttpError, requestJson, type Timed } from "@/lib/data/request";

const BASE = process.env.BLOCKSCOUT_API_URL || process.env.BLOCKSCOUT_API_BASE || "https://robinhoodchain.blockscout.com/api/v2";

export interface ContractMeta {
  /** true only if Blockscout says the source is verified */
  verified: boolean;
  name: string | null;
  compilerVersion: string | null;
  language: string | null;
  proxyType: string | null;
  implementation: string | null;
}

interface RawContract {
  is_verified?: boolean;
  name?: string;
  compiler_version?: string;
  language?: string;
  proxy_type?: string | null;
  implementations?: Array<{ address_hash?: string }>;
}

export async function getContractMeta(address: string): Promise<Timed<ContractMeta>> {
  let t;
  try {
    t = await requestJson<RawContract>(`${BASE}/smart-contracts/${address}`, {
      timeoutMs: 6000,
      retries: 0,
      headers: { accept: "application/json" },
    });
  } catch (e) {
    // never surface an HTML challenge page as an error message
    if (e instanceof HttpError) {
      throw new Error(/just a moment|cloudflare/i.test(e.message) ? `Explorer blocked the request (HTTP ${e.status}, bot challenge)` : `Explorer returned HTTP ${e.status}`);
    }
    throw e;
  }
  const d = t.data;
  if (typeof d !== "object" || d === null) throw new Error("Malformed Blockscout response");
  return {
    data: {
      verified: d.is_verified === true,
      name: d.name ?? null,
      compilerVersion: d.compiler_version ?? null,
      language: d.language ?? null,
      proxyType: d.proxy_type ?? null,
      implementation: d.implementations?.[0]?.address_hash ?? null,
    },
    latencyMs: t.latencyMs,
  };
}
