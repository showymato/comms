import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/data/request";
import { evaluateLive, isBadPolicy, resolvePolicy } from "@/lib/live/evaluate-server";
import { fail } from "@/lib/providers/serve";
import { toLiveApiResponse } from "@/lib/api-shape";

/**
 * POST /api/eligibility/check   { asset: "0x…" | "AAPL", policy?: "DEFAULT" | { minLiquidityUsd, … } }
 * Runs the deterministic engine over live evidence. Read-only. Checks with no verifiable source are UNKNOWN.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("comms", 400, "Body must be JSON.");
  }
  const b = (body ?? {}) as { asset?: unknown; address?: unknown; policy?: unknown };
  const target = typeof b.asset === "string" ? b.asset : typeof b.address === "string" ? b.address : "";
  if (!target.trim()) return fail("comms", 400, 'Provide "asset": a contract address or symbol.');
  const policy = resolvePolicy(b.policy);
  if (isBadPolicy(policy)) return fail("comms", 400, 'Unknown policy. Use a policy id (e.g. "DEFAULT") or { minLiquidityUsd, oracleRequired, transferRequired, redemptionRequired }.');

  try {
    const ev = await evaluateLive(target, policy);
    if (!ev) return fail("comms", 404, `No Stock Token matches "${target}".`);
    return NextResponse.json({ data: toLiveApiResponse(ev), meta: { provider: "comms", fetchedAt: ev.result.evaluatedAt } }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail("comms", 502, errorMessage(e));
  }
}
