import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/data/request";
import { buildLiveAsset, primaryDeployment } from "@/lib/live/evidence";
import { cachedContract, cachedPrice, cachedRegistry, resolveAsset } from "@/lib/providers/server-data";
import { fail } from "@/lib/providers/serve";

/** GET /api/assets/{address|symbol} — registry row + latest quote + pinned-block contract reads, each with its own status. */
export async function GET(_req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address: symbol } = await ctx.params;
  const registry = await resolveAsset(symbol).catch(() => null);
  if (!registry) return fail("robinhood", 404, `No Stock Token matches "${symbol}" in the Robinhood registry.`);

  const dep = primaryDeployment(registry);
  const errors: Record<string, string> = {};
  const [price, contract, reg] = await Promise.all([
    cachedPrice(registry.tokenSymbol).catch((e) => ((errors.price = errorMessage(e)), null)),
    dep ? cachedContract(dep.contractAddress).catch((e) => ((errors.chain = errorMessage(e)), null)) : Promise.resolve(null),
    cachedRegistry(),
  ]);

  const asset = buildLiveAsset({
    registry,
    price: price?.value ?? null,
    contract: contract ? { block: contract.value.block, blockTime: contract.value.blockTime, paused: contract.value.paused, hasBytecode: contract.value.hasBytecode } : null,
    registryFetchedAt: new Date(reg.at).toISOString(),
    now: Date.now(),
  });

  return NextResponse.json(
    { data: { registry, asset, contract: contract?.value ?? null }, meta: { provider: "robinhood", fetchedAt: new Date().toISOString(), errors } },
    { headers: { "cache-control": "no-store" } },
  );
}
