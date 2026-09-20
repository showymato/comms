import { NextResponse } from "next/server";
import { POLICIES } from "@/data/policies";
import { encodePolicyId, parsePolicyInput } from "@/lib/live/policy-codec";
import { fail } from "@/lib/providers/serve";

/** GET /api/policies — the built-in policies. */
export function GET() {
  return NextResponse.json({ data: POLICIES, meta: { provider: "comms", fetchedAt: new Date().toISOString() } });
}

/**
 * POST /api/policies  { name?, minLiquidityUsd, oracleRequired?, transferRequired?, redemptionRequired? }
 * Validates a policy and returns it with a stateless id (`c.…`). Nothing is stored server-side — `persisted: false` says so —
 * but the id is self-describing, so it can be passed as `policy` to /api/eligibility/check and resolved by GET /api/policies/{id}.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("comms", 400, "Body must be JSON.");
  }
  const input = parsePolicyInput(body);
  if (typeof input === "string") return fail("comms", 400, input);
  const id = encodePolicyId(input);
  return NextResponse.json(
    {
      data: { id, name: input.name ?? "CUSTOM", description: input.description ?? "Custom policy.", minLiquidityUsd: input.minLiquidityUsd, oracleRequired: input.oracleRequired, transferRequired: input.transferRequired, redemptionRequired: input.redemptionRequired, builtIn: false, persisted: false },
      meta: { provider: "comms", fetchedAt: new Date().toISOString() },
    },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
