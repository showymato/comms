import { NextResponse } from "next/server";
import { DATA_MODE, SERVER_TTL } from "@/lib/data/config";
import { errorMessage } from "@/lib/data/request";
import * as alphaVantage from "@/lib/providers/alphaVantage";
import * as coingecko from "@/lib/providers/coingecko";
import { RPC_URL } from "@/lib/chain/rh-client";
import { serverCache } from "@/lib/providers/serve";
import type { ProviderStatus } from "@/types";

/** Last four characters only — a key is never returned in full, and never sent to the client. */
const mask = (key: string | undefined) => (key ? `••••••••${key.slice(-4)}` : null);

async function probe(id: ProviderStatus["id"], label: string, role: ProviderStatus["role"], configured: boolean, run: () => Promise<{ latencyMs: number }>): Promise<ProviderStatus & { keyHint?: string | null }> {
  const base = { id, label, role, configured, latencyMs: null, lastSuccessAt: null, lastError: null } as const;
  if (!configured) return { ...base, health: "NOT_CONFIGURED" };
  try {
    const r = await serverCache.get(`probe:${id}`, run, { ttlMs: SERVER_TTL.contract * 1000 });
    return { ...base, health: "LIVE", latencyMs: r.value.latencyMs, lastSuccessAt: new Date(r.at).toISOString() };
  } catch (e) {
    return { ...base, health: "DEGRADED", lastError: errorMessage(e) };
  }
}

/**
 * GET /api/status — which optional providers are configured (server-side env only) and whether they answer.
 * Probes are cached 2 minutes. Keys are masked. Robinhood + chain health is reported by their own routes'
 * envelopes (real request latency), which the client aggregates.
 */
export async function GET() {
  const [cg, av] = await Promise.all([
    probe("coingecko", "CoinGecko", "ENRICHMENT", coingecko.coingeckoConfigured(), coingecko.ping),
    probe("alphavantage", "Alpha Vantage", "ENRICHMENT", alphaVantage.alphaVantageConfigured(), alphaVantage.ping),
  ]);
  return NextResponse.json(
    {
      data: {
        mode: DATA_MODE,
        rpcHost: new URL(RPC_URL).host,
        providers: [
          { ...cg, keyHint: mask(process.env.COINGECKO_API_KEY) },
          { ...av, keyHint: mask(process.env.ALPHA_VANTAGE_API_KEY) },
        ],
      },
      meta: { provider: "comms", fetchedAt: new Date().toISOString() },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
