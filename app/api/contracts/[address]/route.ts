import { NextResponse } from "next/server";
import { SERVER_TTL } from "@/lib/data/config";
import { errorMessage } from "@/lib/data/request";
import { isAddress } from "@/lib/format";
import { cachedContract, fetchers, KEYS } from "@/lib/providers/server-data";
import { fail, serverCache } from "@/lib/providers/serve";

/**
 * GET /api/contracts/{address} — contract inspection: bytecode, paused(), name/symbol/decimals/supply, pinned to one block
 * (Robinhood Chain RPC), plus Blockscout verification metadata as optional enrichment. Verification is reported
 * only if Blockscout answered; otherwise it is "unavailable" — never assumed.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  if (!isAddress(address)) return fail("chain", 400, "Not a valid 0x address.");

  let onchain;
  try {
    onchain = await cachedContract(address);
  } catch (e) {
    return fail("chain", 502, errorMessage(e));
  }

  let explorer: { status: "ok"; verified: boolean; name: string | null; compilerVersion: string | null; proxyType: string | null; implementation: string | null } | { status: "unavailable"; error: string };
  try {
    const r = await serverCache.get(KEYS.explorer(address), fetchers.explorer(address), { ttlMs: SERVER_TTL.contract * 1000 });
    explorer = { status: "ok", ...r.value.data };
  } catch (e) {
    explorer = { status: "unavailable", error: errorMessage(e) };
  }

  return NextResponse.json(
    { data: { onchain: onchain.value, explorer }, meta: { provider: "chain", fetchedAt: new Date(onchain.at).toISOString(), latencyMs: onchain.latencyMs, stale: onchain.stale } },
    { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } },
  );
}
