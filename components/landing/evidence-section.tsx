"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { EvidencePanel } from "@/components/assets/evidence-panel";
import { ResultTag } from "@/components/ui/status";
import { ASSETS } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { eligibilityService } from "@/lib/services";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/motion-bits";
import { Section } from "./section-shell";

export function EvidenceSection() {
  const result = useMemo(() => eligibilityService.evaluate(ASSETS[0], POLICIES[0]), []);
  const [id, setId] = useState(result.checks[1].id);
  const check = result.checks.find((c) => c.id === id)!;

  return (
    <Section
      id="evidence"
      index="05"
      eyebrow="Evidence"
      title={
        <>
          Every decision has a reason.
          <br />
          <span className="text-ink-3">Every reason has evidence.</span>
        </>
      }
      lead="Each check stores what it read, where it read it from, at which block and when. Nothing in a decision is asserted without a record you can audit."
    >
      <Reveal className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        <div className="overflow-hidden rounded-xl border border-line bg-surface/60">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="label !text-ink-2">Check breakdown · AAPL · DEFAULT</span>
            <span className="font-mono text-[11px] text-ink-3">Select a check</span>
          </div>
          <ul role="list">
            {result.checks.map((c, i) => {
              const active = c.id === id;
              return (
                <li key={c.id} className="relative border-b border-line last:border-0">
                  {i < result.checks.length - 1 ? <span aria-hidden className="absolute top-[34px] bottom-[-17px] left-[27px] w-px bg-line-2" /> : null}
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setId(c.id)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setId(c.id)}
                    className={cn("relative flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors", active ? "bg-white/[0.045]" : "hover:bg-white/[0.025]")}
                  >
                    {active ? <motion.span layoutId="ev-active" className="absolute inset-y-0 left-0 w-0.5 bg-cyan" /> : null}
                    <span className={cn("relative z-10 size-[7px] rounded-full ring-4 ring-surface", active ? "bg-eligible" : "bg-eligible/50")} aria-hidden />
                    <span className="flex-1 text-[14px] text-ink">{c.label}</span>
                    <ResultTag result={c.result} text={c.passLabel} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border border-line-2 bg-base-2 shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div>
              <div className="label mb-1">Evidence</div>
              <div className="font-mono text-[14px] text-ink">{check.field}</div>
            </div>
            <span className="rounded-xs border border-line-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">AUDITABLE</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16 }}>
              <EvidencePanel check={check} compactJson />
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </Section>
  );
}
