"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { StatusBadge } from "@/components/ui/status";
import { json } from "@/data/api-docs";
import { cn } from "@/lib/utils";
import { Section } from "./section-shell";

const STEPS = [
  { key: "Event detected", detail: "Transfer restriction changed", log: "event.detected     TRANSFER_RESTRICTED  asset=AAPL", t: "+0 ms" },
  { key: "State engine", detail: "transferRestricted  FALSE → TRUE", log: "state.updated      transferRestricted=true", t: "+38 ms" },
  { key: "Eligibility recalculation", detail: "9 checks re-run on the new state", log: "eligibility.run    9 checks · 8 pass · 1 fail", t: "+61 ms" },
  { key: "Policy evaluation", detail: "DEFAULT · transfer must not be restricted", log: "policy.evaluate    DEFAULT → hard requirement failed", t: "+64 ms" },
  { key: "Decision changed", detail: "", log: "decision.changed   ELIGIBLE → INELIGIBLE  TRANSFER_RESTRICTED", t: "+66 ms" },
  { key: "Webhook sent", detail: "POST /hooks/comms · 200 · 94 ms", log: "webhook.delivered  wh_01 200 OK", t: "+160 ms" },
] as const;

const PAYLOAD = json({
  event: "ELIGIBILITY_CHANGED",
  asset: "0x1234567890abcdef1234567890abcdef12345678",
  previous: "ELIGIBLE",
  current: "INELIGIBLE",
  reason: "TRANSFER_RESTRICTED",
  timestamp: "2026-09-20T21:03:42Z",
});

export function SystemPulse() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(-1);
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(STEPS.length - 1);
      return;
    }
    let i = -1;
    let hold = 0;
    const id = setInterval(() => {
      if (i < STEPS.length - 1) {
        i += 1;
        setCurrent(i);
      } else if (++hold > 4) {
        i = -1;
        hold = 0;
        setCurrent(-1);
      }
    }, 900);
    return () => clearInterval(id);
  }, [inView, reduce, round]);

  return (
    <Section
      demo
      id="realtime"
      index="06"
      eyebrow="Real-time state"
      title={
        <>
          Watch a decision
          <br />
          <span className="text-ink-3">change in real time.</span>
        </>
      }
      lead="When the state of a token changes, COMMS re-runs the checks, re-applies the policy and tells your protocol. This is a simulated sequence on demo data."
    >
      <div ref={ref} className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <ol className="relative overflow-hidden rounded-xl border border-line bg-surface/60 p-5 sm:p-7" aria-label="System pulse sequence">
          <span aria-hidden className="absolute top-9 bottom-9 left-[35px] w-px bg-line-2 sm:left-[43px]" />
          <motion.span
            aria-hidden
            className="absolute top-9 left-[35px] w-px origin-top bg-linear-to-b from-cyan to-azure sm:left-[43px]"
            style={{ bottom: "2.25rem" }}
            animate={{ scaleY: Math.max(0, current) / (STEPS.length - 1) }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          {STEPS.map((s, i) => {
            const on = i <= current;
            const now = i === current;
            const changed = i === 4;
            return (
              <li key={s.key} className="relative flex gap-5 py-3.5">
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border bg-base transition-colors duration-300",
                    on ? (changed ? "border-ineligible" : "border-cyan") : "border-line-2",
                  )}
                >
                  <span className={cn("size-[7px] rounded-full transition-colors duration-300", on ? (changed ? "bg-ineligible" : "bg-cyan") : "bg-transparent")} />
                  {now ? <span className={cn("absolute inset-0 animate-pulse-ring rounded-full", changed ? "text-ineligible" : "text-cyan")} /> : null}
                </span>
                <div className={cn("min-w-0 transition-opacity duration-300", on ? "opacity-100" : "opacity-35")}>
                  <div className="label !text-ink-2">{s.key}</div>
                  {changed ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status="ELIGIBLE" />
                      <span aria-hidden className="font-mono text-ink-3">→</span>
                      <StatusBadge status="INELIGIBLE" />
                    </div>
                  ) : (
                    <div className="mt-1 text-[15px] text-ink">{s.detail}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-line bg-base-1">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="label !text-ink-2">System log</span>
              <button type="button" onClick={() => { setCurrent(-1); setRound((r) => r + 1); }} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-3 hover:text-ink">
                <RotateCcw size={11} /> Replay
              </button>
            </div>
            <ol className="h-[172px] overflow-hidden px-4 py-3 font-mono text-[11.5px] leading-[1.9]" aria-live="off">
              <AnimatePresence initial={false}>
                {STEPS.slice(0, current + 1).map((s, i) => (
                  <motion.li key={s.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn("flex gap-3 whitespace-pre", i === 4 ? "text-ineligible" : "text-ink-2")}>
                    <span className="w-14 shrink-0 text-ink-4">{s.t}</span>
                    <span className="truncate">{s.log}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
              {current < 0 ? <li className="text-ink-4">Waiting for state change<span className="animate-blink">_</span></li> : null}
            </ol>
          </div>

          <motion.div animate={{ opacity: current >= 5 ? 1 : 0.28 }} transition={{ duration: 0.4 }}>
            <CodeBlock code={PAYLOAD} lang="json" title="Webhook payload" />
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
