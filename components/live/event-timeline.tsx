"use client";

import { AnimatePresence, motion } from "motion/react";
import { SourceBadge } from "@/components/live/badges";
import { StatusGlyph } from "@/components/ui/status";
import { useLive } from "@/hooks/use-live";
import { formatClock } from "@/lib/format";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { EligibilityEventLive } from "@/types";

const KIND_TONE: Record<EligibilityEventLive["kind"], string> = {
  PRICE_UPDATED: "text-cyan",
  STATE_CHECKED: "text-ink-2",
  ELIGIBILITY_EVALUATED: "text-ink",
  ELIGIBILITY_CHANGED: "text-conditional",
  STATE_CHANGED: "text-conditional",
  CORPORATE_ACTION: "text-iris",
  BLOCK_ADVANCED: "text-ink-3",
};

/**
 * Events COMMS actually observed in this session, newest first. Every row is the result of a real request or a
 * real diff between two observations — there is no simulated feed. Empty until something is observed.
 * Rows stack (time · symbol · kind, then detail) so the list works in any container width.
 */
export function EventTimeline({ symbol, limit = 40, className }: { symbol?: string; limit?: number; className?: string }) {
  const all = useLive((s) => s.events);
  const events = (symbol ? all.filter((e) => e.symbol === symbol) : all).slice(0, limit);

  return (
    <div className={cn("font-mono text-[12px]", className)}>
      {events.length === 0 ? (
        <p className="px-4 py-6 text-[12.5px] leading-relaxed text-ink-3">
          No events observed yet. Open an asset to start watching it — price changes, state checks and eligibility evaluations appear here as they really happen.
        </p>
      ) : (
        <ol>
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.li
                key={e.id}
                layout="position"
                initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="border-b border-line px-4 py-2.5 last:border-0"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="tabular text-ink-4">{formatClock(e.timestamp)}</span>
                  <span className="font-medium text-ink">{e.symbol}</span>
                  <span className={cn("tracking-[0.04em]", KIND_TONE[e.kind])}>{e.kind}</span>
                  <span className="ml-auto">
                    <SourceBadge source={e.source} at={e.timestamp} />
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-ink-2 [overflow-wrap:anywhere]">
                  {e.current ? <StatusGlyph status={e.current} size={11} className={STATUS[e.current].text} /> : null}
                  {e.detail}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}
