"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import type { EligibilityResult } from "@/types";
import { ASSETS } from "@/data/assets";
import { CHECK_SPECS } from "@/lib/engine";
import { eligibilityService, policyService } from "@/lib/services";
import { useStore } from "@/hooks/use-store";
import { isAddress } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { DecisionCard } from "./decision-card";
import { EvaluationPipeline } from "./evaluation-pipeline";

const PICKS = ["AAPL", "TSLA", "NFLX", "AMD"].map((s) => ASSETS.find((a) => a.symbol === s)!);
const UNREGISTERED = "0x00000000000000000000000000000000c0ffee01";

type Phase = "idle" | "loading" | "pipeline" | "done";

export function AssetChecker({ className, showLink = false }: { className?: string; showLink?: boolean }) {
  const inputId = useId();
  const policyId = useId();
  const policies = useStore(policyService.state);
  const [address, setAddress] = useState(ASSETS[0].address);
  const [policy, setPolicy] = useState("DEFAULT");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [run, setRun] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showChecks, setShowChecks] = useState(false);

  const registered = result ? ASSETS.find((a) => a.address === result.address) : undefined;

  async function submit() {
    const value = address.trim();
    if (!isAddress(value)) {
      setError("Enter a 42-character token address starting with 0x.");
      return;
    }
    setError(null);
    setShowChecks(false);
    setPhase("loading");
    const r = await eligibilityService.check(value, policy);
    if (!r) {
      setError("Policy not found.");
      setPhase("idle");
      return;
    }
    setResult(r);
    setRun((n) => n + 1);
    setPhase("pipeline");
  }

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]", className)}>
      {/* ───── input ───── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col rounded-xl border border-line bg-surface/80 p-5 hairline-top"
      >
        <label htmlFor={inputId} className="label">
          Token contract address
        </label>
        <input
          id={inputId}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          placeholder="0x…"
          className="mt-2 h-11 w-full rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[12.5px] text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-cyan/60"
        />
        {error ? (
          <p id={`${inputId}-err`} role="alert" className="mt-2 text-xs text-ineligible">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Try</span>
          {PICKS.map((a) => (
            <button
              key={a.symbol}
              type="button"
              onClick={() => {
                setAddress(a.address);
                setError(null);
              }}
              className={cn(
                "h-6 rounded-xs border px-2 font-mono text-[11px] transition-colors",
                address === a.address ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:border-line-2 hover:text-ink",
              )}
            >
              {a.symbol}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAddress(UNREGISTERED)}
            className={cn(
              "h-6 rounded-xs border px-2 font-mono text-[11px] transition-colors",
              address === UNREGISTERED ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:border-line-2 hover:text-ink",
            )}
          >
            No evidence
          </button>
        </div>

        <label htmlFor={policyId} className="label mt-5">
          Policy
        </label>
        <select
          id={policyId}
          value={policy}
          onChange={(e) => setPolicy(e.target.value)}
          className="mt-2 h-11 w-full appearance-none rounded-md border border-line-2 bg-base-1 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2 4.5 6 8l4-3.5%22 fill=%22none%22 stroke=%22%238B95A5%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px] bg-[position:right_12px_center] bg-no-repeat px-3 font-mono text-[12.5px] text-ink outline-none focus:border-cyan/60"
        >
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <Button type="submit" variant="accent" size="lg" magnetic className="mt-6 w-full font-mono tracking-[0.08em]" disabled={phase === "loading" || phase === "pipeline"}>
          {phase === "loading" || phase === "pipeline" ? "EVALUATING…" : "CHECK ELIGIBILITY"}
          <ArrowRight size={16} />
        </Button>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
          Read-only. COMMS never signs, trades, lends or takes custody. Demo data — addresses are simulated.
        </p>
      </form>

      {/* ───── output ───── */}
      <div className="min-h-[520px] rounded-xl border border-line bg-surface/50 p-5" aria-live="polite">
        <div className="mb-3 flex items-center justify-between">
          <span className="label">{phase === "done" && !showChecks ? "Decision" : "Evaluation"}</span>
          {result && registered ? <span className="font-mono text-[11px] text-ink-3">{registered.symbol} · {result.policyId}</span> : null}
          {result && !registered ? <span className="font-mono text-[11px] text-ink-3">Unregistered · {result.policyId}</span> : null}
        </div>

        <AnimatePresence mode="wait">
          {phase === "idle" ? (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ol className="opacity-60">
                {CHECK_SPECS.map((c, i) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    <span className="w-6 font-mono text-[11px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 text-[13.5px] text-ink-3">{c.label}</span>
                    <span className="font-mono text-[10px] text-ink-4">READY</span>
                  </li>
                ))}
              </ol>
            </motion.div>
          ) : null}

          {phase === "loading" ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 pt-1" aria-busy="true">
              {CHECK_SPECS.map((c) => (
                <Skeleton key={c.id} className="h-7" />
              ))}
            </motion.div>
          ) : null}

          {phase === "pipeline" && result ? (
            <motion.div key={`p-${run}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}>
              <EvaluationPipeline checks={result.checks} onComplete={() => setPhase("done")} />
            </motion.div>
          ) : null}

          {phase === "done" && result ? (
            <motion.div key={`d-${run}-${showChecks}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {showChecks ? (
                <StaticChecks result={result} />
              ) : (
                <DecisionCard result={result} />
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowChecks((s) => !s)}>
                  {showChecks ? "Back to decision" : `View ${result.checks.length} checks`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void submit()}>
                  <RotateCcw size={13} /> Run again
                </Button>
                {showLink && registered ? (
                  <Link href={`/assets/${registered.address}`} className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-cyan hover:underline">
                    Open evidence <ArrowRight size={13} />
                  </Link>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StaticChecks({ result }: { result: EligibilityResult }) {
  return (
    <ol>
      {result.checks.map((c, i) => (
        <li key={c.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
          <span className="w-6 font-mono text-[11px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
          <span className="flex-1 text-[13.5px] text-ink">{c.label}</span>
          <span className="font-mono text-[11px]">
            <span className={c.result === "PASS" ? "text-eligible" : c.result === "FAIL" ? "text-ineligible" : "text-unknown"}>
              {c.result === "PASS" ? `✓ ${c.passLabel}` : c.result === "FAIL" ? `✕ ${c.failLabel}` : "? NO DATA"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
