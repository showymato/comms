import { NextResponse } from "next/server";
import { toLiveApiResponse } from "@/lib/api-shape";
import { errorMessage } from "@/lib/data/request";
import { evaluateLive, isBadPolicy, resolvePolicy } from "@/lib/live/evaluate-server";
import { fail } from "@/lib/providers/serve";

/** GET /api/assets/{address|symbol}/eligibility?policy=DEFAULT — the current decision for one Stock Token, with its evidence. */
export async function GET(req: Request, ctx: { params: Promise<{ address: string }> }) {
  const { address } = await ctx.params;
  const policyParam = new URL(req.url).searchParams.get("policy");
  const policy = resolvePolicy(policyParam ?? undefined);
  if (isBadPolicy(policy)) return fail("comms", 400, `Unknown policy "${policyParam}".`);
  try {
    const ev = await evaluateLive(address, policy);
    if (!ev) return fail("comms", 404, `No Stock Token matches "${address}".`);
    return NextResponse.json({ data: toLiveApiResponse(ev), meta: { provider: "comms", fetchedAt: ev.result.evaluatedAt } }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail("comms", 502, errorMessage(e));
  }
}
