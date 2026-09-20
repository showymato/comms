import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/data/request";
import { evaluateLive, isBadPolicy, resolvePolicy } from "@/lib/live/evaluate-server";
import { fail } from "@/lib/providers/serve";
import { toLiveApiResponse } from "@/lib/api-shape";

/** GET /api/eligibility/{address|symbol}?policy=DEFAULT — current eligibility for one Stock Token. */
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
