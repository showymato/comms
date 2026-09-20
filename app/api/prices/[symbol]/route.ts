import { SERVER_TTL } from "@/lib/data/config";
import { fetchers, KEYS, resolveAsset } from "@/lib/providers/server-data";
import { fail, serve } from "@/lib/providers/serve";

/** GET /api/prices/{symbol} — Robinhood /rhj/prices/{symbol}. bid/ask are RAW underlying-equity values. */
export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  // Only forward symbols that exist in the registry: keeps the cache keyspace bounded and avoids proxying arbitrary input.
  const asset = await resolveAsset(symbol).catch(() => null);
  if (!asset) return fail("robinhood", 404, `Unknown Stock Token symbol "${symbol}".`);
  return serve("robinhood", KEYS.price(asset.tokenSymbol), SERVER_TTL.prices, fetchers.price(asset.tokenSymbol));
}
