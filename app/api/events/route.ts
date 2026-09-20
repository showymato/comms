import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/data/request";
import { buildFeed, type FeedType } from "@/lib/live/event-feed";
import { fail } from "@/lib/providers/serve";

const TYPES: FeedType[] = ["CORPORATE_ACTION", "TRANSFER_RESTRICTION", "CONTRACT_EVENT", "ASSET_STATUS_CHANGED", "ORACLE_CHANGE", "ELIGIBILITY_CHANGED"];

/**
 * GET /api/events?type=CORPORATE_ACTION,CONTRACT_EVENT&symbol=AAPL&limit=50&blocks=2000&transfers=1
 *
 * Real events only, each with its source, block, transaction hash and timestamp where they exist:
 *   • onchain logs from the Stock Token contracts on Robinhood Chain (Paused/Unpaused → TRANSFER_RESTRICTION; Upgraded, OwnershipTransferred and — with transfers=1 — Transfer → CONTRACT_EVENT)
 *   • corporate actions from the Robinhood Stock Token API
 * ASSET_STATUS_CHANGED, ORACLE_CHANGE and ELIGIBILITY_CHANGED are derived by diffing observations and need a persistent store, so they are never returned here.
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const raw = u.searchParams.get("type");
  const types = raw ? (raw.split(",").map((t) => t.trim().toUpperCase()) as FeedType[]) : null;
  if (types && types.some((t) => !TYPES.includes(t))) return fail("comms", 400, `Unknown event type. Use: ${TYPES.join(", ")}.`);
  const num = (k: string, d: number, min: number, max: number) => {
    const n = Number(u.searchParams.get(k) ?? d);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : d;
  };
  try {
    const feed = await buildFeed({
      types,
      symbol: u.searchParams.get("symbol"),
      limit: num("limit", 50, 1, 200),
      span: num("blocks", 2000, 100, 20_000),
      transfers: u.searchParams.get("transfers") === "1",
    });
    return NextResponse.json(
      { data: feed.events, range: feed.range, meta: { provider: "comms", fetchedAt: new Date().toISOString(), degraded: feed.degraded } },
      { headers: { "cache-control": "public, s-maxage=8, stale-while-revalidate=30" } },
    );
  } catch (e) {
    return fail("comms", 502, errorMessage(e));
  }
}
