import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/data/request";
import { buildFeed } from "@/lib/live/event-feed";
import { fail } from "@/lib/providers/serve";
import { resolveAsset } from "@/lib/providers/server-data";

/**
 * GET /api/assets/{address|symbol}/history?blocks=20000
 * What actually happened to this token: its onchain lifecycle logs and Robinhood corporate actions.
 * COMMS stores no eligibility history yet, so past eligibility decisions are not returned — and none are invented.
 */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const asset = await resolveAsset(address).catch(() => null);
  if (!asset) return fail("robinhood", 404, `No Stock Token matches "${address}".`);
  const blocks = Number(new URL(req.url).searchParams.get("blocks") ?? 20_000);
  try {
    const feed = await buildFeed({ types: ["CORPORATE_ACTION", "TRANSFER_RESTRICTION", "CONTRACT_EVENT"], symbol: asset.tokenSymbol, limit: 100, span: Number.isFinite(blocks) ? blocks : 20_000, transfers: false });
    return NextResponse.json(
      {
        data: { symbol: asset.tokenSymbol, address: asset.deployments[0]?.contractAddress ?? null, events: feed.events, eligibilityHistory: null, note: "No persisted eligibility history: COMMS has no event store yet." },
        range: feed.range,
        meta: { provider: "comms", fetchedAt: new Date().toISOString(), degraded: feed.degraded },
      },
      { headers: { "cache-control": "public, s-maxage=15" } },
    );
  } catch (e) {
    return fail("comms", 502, errorMessage(e));
  }
}
