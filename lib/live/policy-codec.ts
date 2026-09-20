import type { Policy } from "@/types";

/**
 * Stateless policy ids. COMMS has no policy database yet, so POST /api/policies cannot store a policy — instead the id IS the
 * policy: `c.` + base64url of the four thresholds. Anything that receives the id can decode it, so a "saved" policy is
 * portable and verifiable, and nothing pretends to be persisted server-side.
 */
export interface PolicyInput {
  name?: string;
  description?: string;
  minLiquidityUsd: number;
  oracleRequired: boolean;
  transferRequired: boolean;
  redemptionRequired: boolean;
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");

export function encodePolicyId(p: PolicyInput): string {
  return `c.${b64(JSON.stringify([Math.round(p.minLiquidityUsd), +p.oracleRequired, +p.transferRequired, +p.redemptionRequired]))}`;
}

export function decodePolicyId(id: string): Policy | null {
  if (!id.startsWith("c.")) return null;
  try {
    const [m, o, t, r] = JSON.parse(unb64(id.slice(2))) as [number, number, number, number];
    if (![m, o, t, r].every((n) => Number.isFinite(n)) || m < 0) return null;
    return {
      id,
      name: "CUSTOM",
      description: "Custom policy encoded in its id.",
      minLiquidityUsd: m,
      oracleRequired: o === 1,
      transferRequired: t === 1,
      redemptionRequired: r === 1,
      createdAt: new Date(0).toISOString(),
      builtIn: false,
    };
  } catch {
    return null;
  }
}

/** Validate an untrusted body into a PolicyInput, or return the reason it is invalid. */
export function parsePolicyInput(body: unknown): PolicyInput | string {
  if (typeof body !== "object" || body === null) return "Body must be a JSON object.";
  const o = body as Record<string, unknown>;
  const min = o.minLiquidityUsd;
  if (typeof min !== "number" || !Number.isFinite(min) || min < 0 || min > 1e12) return '"minLiquidityUsd" must be a number between 0 and 1e12.';
  for (const k of ["oracleRequired", "transferRequired", "redemptionRequired"] as const) {
    if (o[k] !== undefined && typeof o[k] !== "boolean") return `"${k}" must be a boolean.`;
  }
  const name = typeof o.name === "string" ? o.name.trim().slice(0, 48) : undefined;
  const description = typeof o.description === "string" ? o.description.trim().slice(0, 240) : undefined;
  return {
    name: name || undefined,
    description: description || undefined,
    minLiquidityUsd: min,
    oracleRequired: o.oracleRequired === undefined ? true : (o.oracleRequired as boolean),
    transferRequired: o.transferRequired === undefined ? true : (o.transferRequired as boolean),
    redemptionRequired: o.redemptionRequired === undefined ? true : (o.redemptionRequired as boolean),
  };
}
