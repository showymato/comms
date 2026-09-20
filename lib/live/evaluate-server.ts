/**
 * Server-side live eligibility: gather real evidence (registry + quote + chain reads), run the deterministic
 * engine. Used by /api/eligibility/*. Every input that fails to load simply stays UNKNOWN in the result.
 */
import { evaluate } from "@/lib/engine";
import { DATA_MODE } from "@/lib/data/config";
import { errorMessage } from "@/lib/data/request";
import { POLICIES } from "@/data/policies";
import { ASSETS } from "@/data/assets";
import type { Asset, DataMode, EligibilityResult, EvidenceSource, Policy } from "@/types";
import { buildLiveAsset, unregisteredAsset, withDemoGaps } from "./evidence";
import { cachedContract, cachedPrice, cachedRegistry, resolveAsset } from "@/lib/providers/server-data";
import { isAddress } from "@/lib/format";
import { decodePolicyId } from "./policy-codec";

export interface ServerEvaluation {
  mode: DataMode;
  result: EligibilityResult;
  asset: { symbol: string; name: string; address: string; registered: boolean };
  /** provider lookups that failed while gathering evidence — the affected checks are UNKNOWN */
  degraded: Array<{ provider: string; error: string }>;
  /** distinct evidence sources that contributed a real value */
  sources: EvidenceSource[];
}

const BAD_POLICY = Symbol("bad-policy");

/** Accepts a policy id, or an inline { minLiquidityUsd, oracleRequired, transferRequired, redemptionRequired } object. */
export function resolvePolicy(input: unknown): Policy | typeof BAD_POLICY {
  if (input === undefined || input === null) return POLICIES[0];
  if (typeof input === "string") return POLICIES.find((p) => p.id === input.toUpperCase()) ?? decodePolicyId(input) ?? BAD_POLICY;
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    const min = o.minLiquidityUsd;
    if (typeof min !== "number" || !Number.isFinite(min) || min < 0) return BAD_POLICY;
    const flag = (v: unknown) => (typeof v === "boolean" ? v : true);
    return {
      id: "CUSTOM",
      name: "CUSTOM",
      description: "Inline policy supplied with the request.",
      minLiquidityUsd: min,
      oracleRequired: flag(o.oracleRequired),
      transferRequired: flag(o.transferRequired),
      redemptionRequired: flag(o.redemptionRequired),
      createdAt: new Date().toISOString(),
      builtIn: false,
    };
  }
  return BAD_POLICY;
}
export const isBadPolicy = (p: Policy | typeof BAD_POLICY): p is typeof BAD_POLICY => p === BAD_POLICY;

export async function evaluateLive(idOrSymbol: string, policy: Policy): Promise<ServerEvaluation | null> {
  const now = Date.now();
  const mode = DATA_MODE;

  if (mode === "demo") {
    const demo = ASSETS.find((a) => a.address.toLowerCase() === idOrSymbol.toLowerCase() || a.symbol === idOrSymbol.toUpperCase());
    if (!demo) return isAddress(idOrSymbol) ? finish(unregisteredAsset(idOrSymbol, new Date(now).toISOString()), policy, mode, [], false, now) : null;
    return finish(demo, policy, mode, [], true, now);
  }

  const registry = await resolveAsset(idOrSymbol).catch(() => null);
  const registryHit = await cachedRegistry().catch(() => null);
  if (!registry) {
    // An address COMMS has no registry entry for → UNKNOWN (never guessed). A bare symbol we don't know → not found.
    if (isAddress(idOrSymbol)) return finish(unregisteredAsset(idOrSymbol, new Date(now).toISOString()), policy, mode, registryHit ? [] : [{ provider: "robinhood", error: "Registry unavailable" }], false, now);
    return null;
  }

  const degraded: ServerEvaluation["degraded"] = [];
  const address = registry.deployments[0]?.contractAddress;
  const [price, contract] = await Promise.all([
    cachedPrice(registry.tokenSymbol).catch((e) => (degraded.push({ provider: "robinhood", error: errorMessage(e) }), null)),
    address ? cachedContract(address).catch((e) => (degraded.push({ provider: "chain", error: errorMessage(e) }), null)) : Promise.resolve(null),
  ]);

  let asset = buildLiveAsset({
    registry,
    price: price?.value ?? null,
    contract: contract ? { block: contract.value.block, blockTime: contract.value.blockTime, paused: contract.value.paused, hasBytecode: contract.value.hasBytecode } : null,
    registryFetchedAt: new Date(registryHit?.at ?? now).toISOString(),
    now,
  });
  if (mode === "hybrid") asset = withDemoGaps(asset, now);
  return finish(asset, policy, mode, degraded, true, now);
}

function finish(asset: Asset, policy: Policy, mode: DataMode, degraded: ServerEvaluation["degraded"], registered: boolean, now: number): ServerEvaluation {
  const result = evaluate(asset, policy, new Date(now).toISOString());
  const sources = [...new Set(result.checks.filter((c) => c.evidence.value !== null).map((c) => c.evidence.source))];
  return { mode, result, asset: { symbol: asset.symbol, name: asset.name, address: asset.address, registered }, degraded, sources };
}
