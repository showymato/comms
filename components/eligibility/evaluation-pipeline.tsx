"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { CheckOutcome } from "@/types";
import { ResultTag } from "@/components/ui/status";
import { cn } from "@/lib/utils";

/**
 * Animated evaluation pipeline: checks resolve one after another.
 * Mount with a fresh `key` to restart. Calls `onComplete` after the last row resolves.
 */
export function EvaluationPipeline({
  checks,
  onComplete,
  compact = false,
  className,
}: {
  checks: CheckOutcome[];
  onComplete?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    const step = reduce ? 16 : 230;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setRevealed(n);
      if (n >= checks.length) {
        clearInterval(id);
        setTimeout(() => onComplete?.(), reduce ? 0 : 320);
      }
    }, step);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ol className={cn("relative", className)} aria-label="Evaluation pipeline" aria-live="polite">
      {checks.map((c, i) => {
        const done = i < revealed;
        const running = i === revealed;
        return (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: done || running ? 1 : 0.35, x: 0 }}
            transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2) }}
            className={cn("flex items-center gap-3 border-b border-line last:border-0", compact ? "py-2" : "py-2.5")}
          >
            <span className="w-6 font-mono text-[11px] text-ink-4 tabular">{String(i + 1).padStart(2, "0")}</span>
            <span className={cn("flex-1 text-[13.5px]", done ? "text-ink" : "text-ink-3")}>{c.label}</span>
            <span className="flex h-5 min-w-24 items-center justify-end">
              {done ? (
                <motion.span initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                  <ResultTag result={c.result} text={c.result === "PASS" ? c.passLabel : c.result === "FAIL" ? c.failLabel : undefined} />
                </motion.span>
              ) : running ? (
                <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-cyan">
                  <span aria-hidden className="relative block size-1.5 rounded-full bg-cyan text-cyan">
                    <span className="absolute inset-0 animate-pulse-ring rounded-full" />
                  </span>
                  CHECKING
                </span>
              ) : (
                <span className="font-mono text-[10px] text-ink-4">QUEUED</span>
              )}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
