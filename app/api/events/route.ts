import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/data/request";
import { cachedCorporateActions } from "@/lib/providers/server-data";
import { fail } from "@/lib/providers/serve";

/**
 * GET /api/events — events the server can attest to: Robinhood corporate actions.
 * State-change events (price / status / eligibility transitions) are detected by diffing successive real
 * observations, which needs a persistent store; until COMMS has one they are observed per client session only.
 * Nothing here is generated.
 */
export async function GET() {
  try {
    const r = await cachedCorporateActions();
    const events = r.value.map((a) => ({
      id: a.id,
      type: "CORPORATE_ACTION",
      symbol: a.tokenSymbol,
      action: a.type,
      status: a.status,
      processDate: a.processDate,
      source: "ROBINHOOD",
    }));
    return NextResponse.json(
      { data: events, meta: { provider: "robinhood", fetchedAt: new Date(r.at).toISOString(), latencyMs: r.latencyMs, stale: r.stale } },
      { headers: { "cache-control": "public, s-maxage=60" } },
    );
  } catch (e) {
    return fail("robinhood", 502, errorMessage(e));
  }
}
