"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Per-character roll: only the characters that changed animate (old slides out, new slides in);
 * unchanged characters never re-render visually. No colour flash. `dir` sets the roll direction (price up/down).
 */
export function RollingText({ value, dir = 1, className }: { value: string; dir?: 1 | -1; className?: string }) {
  const reduce = useReducedMotion();
  const chars = value.split("");
  return (
    <span className={cn("tabular inline-flex overflow-hidden align-bottom", className)}>
      <span className="sr-only">{value}</span>
      {chars.map((ch, i) => (
        <span key={chars.length - i} aria-hidden className="relative inline-block whitespace-pre">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={ch}
              className="inline-block"
              initial={reduce ? false : { y: `${dir * 60}%`, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? undefined : { y: `${dir * -60}%`, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
