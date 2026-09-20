/**
 * Live implementations of the service contracts. Assets, prices and chain reads come from the LiveDataManager;
 * the engine is the same pure deterministic function the demo uses. No simulated latency: `check` performs a
 * real contract read before it evaluates.
 */
import type { Asset, CheckRun, Policy } from "@/types";
import { evaluate } from "@/lib/engine";
import { liveManager } from "@/lib/data/live-manager";
import { unregisteredAsset } from "@/lib/live/evidence";
import { createStore } from "@/lib/store";
import { POLICIES } from "@/data/policies";
import { mockPolicyService } from "../mock";
import type { EligibilityService } from "../contracts";

const runStore = createStore<CheckRun[]>([]);

const now = () => new Date().toISOString();

export const liveEligibilityService: EligibilityService = {
  runs: runStore,
  evaluate(asset: Asset, policy: Policy) {
    const at = liveManager().store.get().evaluatedAt;
    return evaluate(asset, policy, new Date(at ?? Date.now()).toISOString());
  },
  async check(address, policyId = "DEFAULT") {
    const policy = (await mockPolicyService.get(policyId)) ?? POLICIES[0];
    const m = liveManager();
    const q = address.trim().toLowerCase();
    let asset = m.store.get().assets.find((a) => a.address.toLowerCase() === q || a.symbol.toLowerCase() === q);
    if (asset) {
      // fresh pinned-block read of the contract before evaluating, so the decision uses current evidence
      await m.fetchContract(asset.address, asset.symbol);
      asset = m.store.get().assets.find((a) => a.address.toLowerCase() === q || a.symbol.toLowerCase() === q) ?? asset;
    }
    const target = asset ?? unregisteredAsset(address.trim(), now());
    const result = evaluate(target, policy, now());
    runStore.set((r) => [{ id: `run_${Date.now().toString(36)}`, address: target.address, symbol: target.symbol, policyId: policy.id, status: result.status, timestamp: result.evaluatedAt }, ...r].slice(0, 12));
    return result;
  },
  async history() {
    // COMMS keeps no persisted eligibility history yet; observed events are shown from the live session instead.
    return [];
  },
};
