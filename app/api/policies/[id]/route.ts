import { NextResponse } from "next/server";
import { POLICIES } from "@/data/policies";
import { decodePolicyId } from "@/lib/live/policy-codec";
import { fail } from "@/lib/providers/serve";

/** GET /api/policies/{id} — a built-in policy (DEFAULT, INSTITUTIONAL, FLEXIBLE) or a stateless custom id returned by POST /api/policies. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const policy = POLICIES.find((p) => p.id === id.toUpperCase()) ?? decodePolicyId(id);
  if (!policy) return fail("comms", 404, `No policy "${id}". Built-in ids: ${POLICIES.map((p) => p.id).join(", ")}.`);
  return NextResponse.json({ data: { ...policy, persisted: policy.builtIn || POLICIES.some((p) => p.id === policy.id) }, meta: { provider: "comms", fetchedAt: new Date().toISOString() } });
}
