"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Asset, CheckResult, EligibilityResult, Policy } from "@/types";
import { DecisionCard } from "@/components/eligibility/decision-card";
import { ResultTag, StatusGlyph } from "@/components/ui/status";
import { CHECK_STATUS, STATUS } from "@/lib/status";
import { eligibilityService } from "@/lib/services";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const combine = (...r: CheckResult[]): CheckResult => (r.includes("FAIL") ? "FAIL" : r.includes("UNKNOWN") ? "UNKNOWN" : "PASS");
const c = (r: EligibilityResult, id: string) => r.checks.find((x) => x.id === id)!.result;

function rows(asset: Asset, policy: Policy, r: EligibilityResult) {
  const s = asset.state;
  const txt = (v: boolean | null, y: string, n: string) => (v === null ? "No evidence" : v ? y : n);
  const restrictions = [s.paused.value && "Paused", s.transferRestricted.value && "Transfer restricted", s.issuerRestricted.value && "Issuer restricted"].filter(Boolean) as string[];
  const restrictionKnown = [s.paused.value, s.transferRestricted.value, s.issuerRestricted.value].every((v) => v !== null);
  return [
    { k: "Liquidity", asset: formatUsd(s.liquidityUsd.value), policyLabel: "Minimum liquidity", policy: policy.minLiquidityUsd > 0 ? `≥ ${formatUsd(policy.minLiquidityUsd)}` : "Not required", result: r.rules.find((x) => x.id === "minLiquidity")!.result, soft: true },
    { k: "Oracle", asset: s.oracleHealthy.value === null || s.priceFresh.value === null ? "No evidence" : s.oracleHealthy.value && s.priceFresh.value ? "Healthy · fresh" : s.oracleHealthy.value ? "Stale price" : "Unhealthy", policyLabel: "Oracle required", policy: policy.oracleRequired ? "Yes" : "No", result: r.rules.find((x) => x.id === "oracleRequired")!.result },
    { k: "Transfer", asset: txt(s.transferEnabled.value, "Enabled", "Disabled"), policyLabel: "Transfer required", policy: policy.transferRequired ? "Yes" : "No", result: r.rules.find((x) => x.id === "transferRequired")!.result },
    { k: "Redemption", asset: txt(s.redemptionEnabled.value, "Enabled", "Disabled"), policyLabel: "Redemption required", policy: policy.redemptionRequired ? "Yes" : "No", result: r.rules.find((x) => x.id === "redemptionRequired")!.result },
    { k: "Restrictions", asset: !restrictionKnown && restrictions.length === 0 ? "No evidence" : restrictions.length ? restrictions.join(", ") : "None", policyLabel: "Always applied", policy: "None allowed", result: combine(c(r, "tokenPaused"), c(r, "transferRestricted"), c(r, "issuerRestriction")) },
    { k: "Asset", asset: s.active.value === null || s.collateralSupported.value === null ? "No evidence" : s.active.value && s.collateralSupported.value ? "Active · supported" : "Inactive or unsupported", policyLabel: "Always applied", policy: "Active · supported", result: combine(c(r, "assetActive"), c(r, "collateralSupported")) },
  ];
}

export function PolicySimulator({ assets, policies, initialAsset, initialPolicy }: { assets: Asset[]; policies: Policy[]; initialAsset?: string; initialPolicy?: string }) {
  const [assetAddr, setAssetAddr] = useState(assets.find((a) => a.address === initialAsset)?.address ?? (assets.find((a) => a.symbol === "AAPL") ?? assets[0]).address);
  const [policyId, setPolicyId] = useState(policies.find((p) => p.id === initialPolicy)?.id ?? "DEFAULT");

  const asset = assets.find((a) => a.address === assetAddr)!;
  const policy = policies.find((p) => p.id === policyId) ?? policies[0];
  const result = useMemo(() => eligibilityService.evaluate(asset, policy), [asset, policy]);
  const table = rows(asset, policy, result);

  const sel = "h-10 w-full rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[12.5px] text-ink outline-none focus:border-cyan/60";

  return (
    <section id="simulator" aria-labelledby="sim-title" className="scroll-mt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-2">Simulator</div>
          <h2 id="sim-title" className="text-[24px] font-semibold tracking-[-0.03em] text-ink">Test a policy.</h2>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
          <div className="sm:w-60">
            <label htmlFor="sim-asset" className="label mb-1.5 block">Asset</label>
            <select id="sim-asset" className={sel} value={assetAddr} onChange={(e) => setAssetAddr(e.target.value)}>
              {assets.map((a) => (
                <option key={a.address} value={a.address}>{a.symbol} · {a.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-52">
            <label htmlFor="sim-policy" className="label mb-1.5 block">Policy</label>
            <select id="sim-policy" className={sel} value={policyId} onChange={(e) => setPolicyId(e.target.value)}>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface/60">
        <div className="hidden grid-cols-[1fr_56px_1fr] border-b border-line bg-ink/2 md:grid">
          <div className="label px-5 py-3 !text-ink-2">Current state · {asset.symbol}</div>
          <div />
          <div className="label border-l border-line px-5 py-3 !text-ink-2">Policy requirements · {policy.name}</div>
        </div>
        <ul>
          {table.map((r, i) => (
            <motion.li key={r.k} layout="position" className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-line last:border-0 md:grid-cols-[1fr_56px_1fr]">
              <div className="px-5 py-3.5">
                <div className="label md:hidden">{r.k}</div>
                <div className="hidden text-[12px] text-ink-3 md:block">{r.k}</div>
                <div className={cn("font-mono text-[13.5px]", r.asset === "No evidence" ? "text-unknown" : "text-ink")}>{r.asset}</div>
              </div>
              <div className="order-last col-span-2 flex items-center px-5 pb-3 md:order-none md:col-span-1 md:hidden md:p-0">
                <ResultTag result={r.result} text={r.result === "PASS" ? "MET" : r.result === "FAIL" ? "NOT MET" : "NO DATA"} />
              </div>
              <div className={cn("hidden place-items-center md:grid", STATUS[CHECK_STATUS[r.result]].text)}>
                <StatusGlyph status={CHECK_STATUS[r.result]} size={20} />
                <span className="sr-only">{r.result === "PASS" ? "Requirement met" : r.result === "FAIL" ? "Requirement not met" : "No evidence"}</span>
              </div>
              <div className="px-5 py-3.5 md:border-l md:border-line" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="text-[12px] text-ink-3">{r.policyLabel}</div>
                <div className="font-mono text-[13.5px] text-ink-2">{r.policy}</div>
              </div>
            </motion.li>
          ))}
        </ul>
        <div className="border-t border-line-2 bg-base-1/60 p-5">
          <div className="label mb-3">Decision</div>
          <DecisionCard result={result} size="md" updated="Evaluated with the selected policy" key={result.status + policyId + assetAddr} />
        </div>
      </div>
    </section>
  );
}
