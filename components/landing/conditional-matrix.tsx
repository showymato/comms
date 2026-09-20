"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { CheckResult, EligibilityResult } from "@/types";
import { ASSETS } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { eligibilityService } from "@/lib/services";
import { ResultTag, StatusBadge, StatusGlyph } from "@/components/ui/status";
import { CHECK_STATUS, STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { Section } from "./section-shell";

interface Layer {
  id: string;
  name: string;
  question: string;
  detail: string;
  source?: string;
  map?: (r: EligibilityResult) => { result: CheckResult; text?: string } | null;
}

const check = (r: EligibilityResult, id: string) => r.checks.find((c) => c.id === id)!;
const pick = (id: string) => (r: EligibilityResult) => {
  const c = check(r, id);
  return { result: c.result, text: c.result === "PASS" ? c.passLabel : c.result === "FAIL" ? c.failLabel : undefined };
};

const LAYERS: Layer[] = [
  { id: "asset-status", name: "Asset status", question: "Is the token active?", detail: "A token that is not active cannot be relied on as collateral. COMMS records the status straight from the contract.", source: "ONCHAIN", map: pick("assetActive") },
  { id: "transferability", name: "Transferability", question: "Can the token move?", detail: "If transfers are disabled, the token cannot be moved into or out of a protocol. The check reads the transfer flag on the token contract.", source: "ONCHAIN", map: pick("transferEnabled") },
  { id: "redemption", name: "Redemption", question: "Can it be redeemed?", detail: "Where a policy requires it, COMMS checks that redemption is available. A policy that does not require redemption ignores this check.", source: "ISSUER", map: pick("redemptionEnabled") },
  {
    id: "oracle",
    name: "Oracle",
    question: "Is there a healthy, fresh price?",
    detail: "Two evidence points: the oracle reports healthy, and the latest price is inside the freshness window. Missing oracle data resolves to UNKNOWN, never a guess.",
    source: "ORACLE",
    map: (r) => {
      const a = check(r, "oracleHealthy").result;
      const b = check(r, "priceFresh").result;
      const result: CheckResult = a === "FAIL" || b === "FAIL" ? "FAIL" : a === "UNKNOWN" || b === "UNKNOWN" ? "UNKNOWN" : "PASS";
      return { result, text: result === "PASS" ? "PASS" : undefined };
    },
  },
  {
    id: "liquidity",
    name: "Liquidity",
    question: "Is there enough depth?",
    detail: "Measured against the policy's minimum liquidity. Below the minimum, the decision becomes CONDITIONAL rather than INELIGIBLE.",
    source: "INDEXER",
    map: (r) => ({ result: r.rules.find((x) => x.id === "minLiquidity")!.result }),
  },
  { id: "permissions", name: "Contract permissions", question: "Are transfers restricted?", detail: "Restrictions placed at the contract level change who can hold or move the token. Any active restriction makes the token INELIGIBLE.", source: "ONCHAIN", map: pick("transferRestricted") },
  { id: "issuer", name: "Issuer restrictions", question: "Has the issuer restricted it?", detail: "An explicit restriction from the issuer is a hard stop under every policy.", source: "ISSUER", map: pick("issuerRestriction") },
  { id: "jurisdiction", name: "Jurisdiction", question: "Do jurisdictional limits apply?", detail: "Jurisdictional context matters to collateral use. It is not evaluated in this demo scenario, so it is shown without a result rather than invented." },
  { id: "rules", name: "Collateral rules", question: "Is it supported as collateral?", detail: "Whether the token is supported as collateral at all. If that evidence is missing, the decision is UNKNOWN.", source: "INDEXER", map: pick("collateralSupported") },
  { id: "pause", name: "Pause / freeze", question: "Is the token paused?", detail: "A paused token cannot function as collateral. The pause flag is read from the contract.", source: "ONCHAIN", map: pick("tokenPaused") },
  { id: "underlying", name: "Underlying asset", question: "Is the underlying in a normal state?", detail: "The state of the stock behind the token. It is not evaluated in this demo scenario, so it is shown without a result rather than invented." },
];

const SCENARIOS = ["AAPL", "TSLA", "NFLX", "AMD"] as const;

export function ConditionalMatrix() {
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>("AAPL");
  const [active, setActive] = useState(LAYERS[3].id);

  const result = useMemo(() => {
    const asset = ASSETS.find((a) => a.symbol === scenario)!;
    return eligibilityService.evaluate(asset, POLICIES[0]);
  }, [scenario]);

  const layer = LAYERS.find((l) => l.id === active)!;
  const outcome = layer.map?.(result) ?? null;

  return (
    <Section
      id="conditional"
      index="02"
      eyebrow="Collateral is conditional"
      title={
        <>
          A token is not collateral
          <br />
          <span className="text-ink-3">just because it exists.</span>
        </>
      }
      lead="A protocol cannot assume that every tokenized stock is safe to use as collateral. Eleven layers decide it. Change the asset below and watch the answer move."
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="label">Asset</span>
        <div role="group" aria-label="Scenario asset" className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scenario === s}
              onClick={() => setScenario(s)}
              className={cn(
                "h-8 rounded-md border px-3 font-mono text-[12px] transition-colors",
                scenario === s ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:border-line-2 hover:text-ink",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-2">
          <span className="label">Decision</span>
          <StatusBadge status={result.status} />
        </span>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {LAYERS.map((l, i) => {
          const o = l.map?.(result) ?? null;
          const status = o ? CHECK_STATUS[o.result] : null;
          const isActive = l.id === active;
          return (
            <button
              key={l.id}
              type="button"
              aria-pressed={isActive}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(l.id)}
              onFocus={() => setActive(l.id)}
              onClick={() => setActive(l.id)}
              className={cn(
                "group relative flex min-h-[112px] flex-col justify-between bg-base-1 p-4 text-left transition-colors",
                isActive ? "bg-surface-2" : "hover:bg-surface",
              )}
            >
              {isActive ? <motion.span layoutId="matrix-active" className="absolute inset-0 border border-cyan/40" transition={{ type: "spring", stiffness: 500, damping: 40 }} /> : null}
              <span className="relative flex items-start justify-between">
                <span className="font-mono text-[10px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                {status ? (
                  <span className={cn("transition-colors", STATUS[status].text)}>
                    <StatusGlyph status={status} size={15} />
                    <span className="sr-only">{o!.result}</span>
                  </span>
                ) : (
                  <span className="font-mono text-[10px] text-ink-4">—</span>
                )}
              </span>
              <span className="relative">
                <span className="block text-[14px] font-medium text-ink">{l.name}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-3">{l.question}</span>
              </span>
            </button>
          );
        })}
        <div className="hidden min-h-[112px] flex-col justify-between bg-base p-4 lg:flex">
          <span className="font-mono text-[10px] text-ink-4">→</span>
          <span>
            <span className="block text-[14px] font-medium text-ink">One decision</span>
            <span className="mt-0.5 block text-[12.5px] text-ink-3">ELIGIBLE, INELIGIBLE, CONDITIONAL or UNKNOWN.</span>
          </span>
        </div>
      </div>

      <div className="mt-4 min-h-[124px] rounded-xl border border-line bg-surface/60 p-5" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div key={layer.id + scenario} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-[15px] font-medium text-ink">{layer.name}</h3>
                {layer.source ? <span className="rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3">SOURCE · {layer.source}</span> : null}
              </div>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{layer.detail}</p>
            </div>
            <div className="md:text-right">
              <div className="label mb-1.5">{scenario} result</div>
              {outcome ? <ResultTag result={outcome.result} text={outcome.text} /> : <span className="font-mono text-[11px] text-ink-3">NOT EVALUATED</span>}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Section>
  );
}
