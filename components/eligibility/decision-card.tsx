"use client";

import { motion } from "motion/react";
import type { EligibilityResult } from "@/types";
import { AnimatedCheck } from "@/components/ui/motion-bits";
import { StatusGlyph } from "@/components/ui/status";
import { REASON_TEXT, STATUS } from "@/lib/status";
import { CHECK_COUNT } from "@/lib/engine";
import { cn } from "@/lib/utils";

/** The primary decision. Status leads; the score is supplementary and visually subordinate. */
export function DecisionCard({
  result,
  updated,
  className,
  size = "lg",
}: {
  result: EligibilityResult;
  updated?: string;
  className?: string;
  size?: "md" | "lg";
}) {
  const m = STATUS[result.status];
  const allPassed = result.passed === CHECK_COUNT;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative overflow-hidden rounded-xl border bg-base-1", m.border, className)}
      role="status"
      aria-label={`Eligibility decision: ${m.sr}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${m.hex}22, transparent 60%)` }} />
      {result.status === "ELIGIBLE" ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[46%] size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-eligible/50"
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 6, opacity: 0 }}
          transition={{ duration: 1.3, ease: "easeOut" }}
        />
      ) : null}
      <div className={cn("relative flex flex-col items-center text-center", size === "lg" ? "px-6 py-8" : "px-5 py-6")}>
        <span className="label">Eligibility</span>
        <div className={cn("mt-4 flex items-center gap-3", m.text)}>
          {result.status === "ELIGIBLE" ? <AnimatedCheck size={size === "lg" ? 34 : 28} delay={0.15} /> : <StatusGlyph status={result.status} size={size === "lg" ? 32 : 26} />}
          <span className={cn("font-semibold tracking-[-0.03em]", size === "lg" ? "text-4xl sm:text-[44px]" : "text-3xl")}>{m.label}</span>
        </div>

        <p className="mt-5 font-mono text-[12px] tracking-[0.08em] text-ink-2 uppercase">
          {allPassed && result.failed === 0 ? (
            <>
              {result.passed} / {CHECK_COUNT} checks passed
            </>
          ) : (
            <>
              {result.passed} passed · {result.failed} failed · {result.unknown} unknown
            </>
          )}
        </p>
        <p className="mt-1.5 text-[13px] text-ink-3">
          {result.passed} checks passed. {result.failed} failed. {result.unknown} unknown.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {result.reasons.map((r) => (
            <span key={r} title={REASON_TEXT[r]} className={cn("rounded-xs border px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.06em]", m.border, m.text, m.bg)}>
              {r}
            </span>
          ))}
        </div>
        <p className="mt-2 max-w-sm text-[12.5px] text-ink-3">{REASON_TEXT[result.reasons[0]]}</p>

        <div className="mt-5 flex items-center gap-3 font-mono text-[11px] text-ink-3">
          <span>{updated ?? "Updated moments ago"}</span>
          <span aria-hidden className="h-3 w-px bg-line-2" />
          <span>
            Score <span className="text-ink-2 tabular">{result.score ?? "—"}</span> <span className="text-ink-4">· supplementary</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
