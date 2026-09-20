"use client";

import { motion } from "motion/react";
import type { EligibilityEvent } from "@/types";
import { StatusBadge } from "@/components/ui/status";
import { formatTimestamp } from "@/lib/format";
import { REASON_TEXT, STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Vertical status history. The spine draws in as it scrolls into view; entries settle in sequence. */
export function HistoryTimeline({ events }: { events: EligibilityEvent[] }) {
  return (
    <ol className="relative" aria-label="Eligibility history, newest first">
      <motion.span
        aria-hidden
        className="absolute top-3 bottom-3 left-[7px] w-px origin-top bg-line-2"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
      {events.map((e, i) => (
        <motion.li
          key={e.id}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="relative pb-6 pl-8 last:pb-0"
        >
          <span aria-hidden className={cn("absolute top-1 left-0 size-[15px] rounded-full border-2 border-base-1", STATUS[e.current].dot)} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-mono text-[12px] text-ink-2 tabular">{formatTimestamp(e.timestamp)}</span>
            {i === 0 ? <span className="rounded-xs border border-cyan/30 bg-cyan/10 px-1.5 font-mono text-[10px] text-cyan">LATEST</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={e.previous} size="sm" className="opacity-70" />
            <span aria-hidden className="font-mono text-ink-3">→</span>
            <span className="sr-only">changed to</span>
            <StatusBadge status={e.current} size="sm" />
          </div>
          <div className="mt-2 font-mono text-[11.5px] text-ink">{e.reason}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-3">{REASON_TEXT[e.reason]}</div>
        </motion.li>
      ))}
    </ol>
  );
}
