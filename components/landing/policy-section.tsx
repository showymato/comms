"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Policy } from "@/types";
import { RuleEditor } from "@/components/policies/rule-editor";
import { Reveal } from "@/components/ui/motion-bits";
import { ResultTag, StatusBadge } from "@/components/ui/status";
import { ASSETS } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { eligibilityService } from "@/lib/services";
import { formatUsd } from "@/lib/format";
import { REASON_TEXT } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Section } from "./section-shell";

const PICKS = ["AAPL", "TSLA", "NFLX", "AMD"];

export function PolicySection() {
  const [rules, setRules] = useState({ minLiquidityUsd: 100_000, oracleRequired: true, transferRequired: true, redemptionRequired: true });
  const [symbol, setSymbol] = useState("TSLA");

  const asset = ASSETS.find((a) => a.symbol === symbol)!;
  const result = useMemo(() => {
    const policy: Policy = { ...POLICIES[0], ...rules, id: "CUSTOM", name: "CUSTOM" };
    return eligibilityService.evaluate(asset, policy);
  }, [asset, rules]);

  return (
    <Section
      id="policy"
      index="07"
      eyebrow="Policy engine"
      title={
        <>
          Your protocol,
          <br />
          <span className="text-ink-3">your requirements.</span>
        </>
      }
      lead="A policy sets the minimum liquidity and whether a healthy oracle, enabled transfers and enabled redemption are required. Change a rule and the same asset gets a different, still deterministic, answer."
    >
      <Reveal className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <RuleEditor value={rules} onChange={setRules} />

        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/60">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="label !text-ink-2">Effect on</span>
            <div role="group" aria-label="Asset" className="flex gap-1">
              {PICKS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={symbol === s}
                  onClick={() => setSymbol(s)}
                  className={cn("h-6 rounded-xs border px-2 font-mono text-[11px] transition-colors", symbol === s ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:text-ink")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="label mb-1.5">Asset liquidity</div>
                <div className="font-mono text-[15px] text-ink">{formatUsd(asset.state.liquidityUsd.value)}</div>
              </div>
              <div>
                <div className="label mb-1.5">Policy minimum</div>
                <div className="font-mono text-[15px] text-ink">{formatUsd(rules.minLiquidityUsd)}</div>
              </div>
            </div>

            <ul className="mt-5 border-t border-line">
              {result.rules.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5">
                  <span className="text-[13.5px] text-ink-2">{r.label}</span>
                  <ResultTag result={r.result} text={r.result === "PASS" ? "MET" : r.result === "FAIL" ? "NOT MET" : "NO DATA"} />
                </li>
              ))}
            </ul>

            <motion.div key={result.status + symbol} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-5" aria-live="polite">
              <div className="label mb-2">Decision</div>
              <StatusBadge status={result.status} size="lg" />
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-3">
                <span className="font-mono text-ink-2">{result.reasons.join(", ")}</span> · {REASON_TEXT[result.reasons[0]]}
              </p>
            </motion.div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
