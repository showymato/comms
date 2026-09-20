"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { EligibilityEvent, EligibilityStatus } from "@/types";
import { CountUp } from "@/components/ui/motion-bits";
import { LiveDot, StatusGlyph } from "@/components/ui/status";
import { eventService } from "@/lib/services";
import { formatClock } from "@/lib/format";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/utils";

export function MetricStrip({ total, counts }: { total: number; counts: Record<EligibilityStatus, number> }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
      <div className="col-span-2 flex items-center justify-between bg-surface/90 px-4 py-3.5 sm:col-span-3 xl:col-span-1 xl:block">
        <dt className="label">Supported assets</dt>
        <dd className="mt-0 text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink xl:mt-2.5">
          <CountUp to={total} />
        </dd>
      </div>
      {STATUS_ORDER.map((s) => (
        <div key={s} className="bg-surface/90 px-4 py-3.5">
          <dt className={cn("label flex items-center gap-1.5", STATUS[s].text)}>
            <StatusGlyph status={s} size={12} />
            {s}
          </dt>
          <dd className="mt-2.5 flex items-baseline gap-2">
            <span className="text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink">
              <CountUp to={counts[s]} />
            </span>
            <span className="font-mono text-[11px] text-ink-3">{Math.round((counts[s] / total) * 100)}%</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

const SERVICES = ["Indexer", "Eligibility engine", "Oracle data", "API", "Webhooks"];

export function SystemHealth() {
  return (
    <section aria-label="System health" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      {SERVICES.map((s) => (
        <div key={s} className="flex flex-col gap-1.5 bg-surface/90 px-4 py-3">
          <span className="label">{s}</span>
          <span className="flex items-center gap-2 font-mono text-[11.5px] tracking-[0.08em] text-eligible">
            <LiveDot />
            OPERATIONAL
          </span>
        </div>
      ))}
    </section>
  );
}

/** Live feed of the latest transitions (simulated stream). */
export function LiveDecisions({ initial }: { initial: EligibilityEvent[] }) {
  const [events, setEvents] = useState(initial);
  useEffect(() => eventService.stream((e) => setEvents((p) => [e, ...p].slice(0, 7))), []);

  return (
    <ul aria-label="Latest status changes" aria-live="off">
      <AnimatePresence initial={false}>
        {events.map((e) => (
          <motion.li
            key={e.id}
            layout="position"
            initial={{ opacity: 0, height: 0, backgroundColor: "rgba(84,214,255,0.10)" }}
            animate={{ opacity: 1, height: "auto", backgroundColor: "rgba(84,214,255,0)" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden border-b border-line last:border-0"
          >
            <Link href={`/app/assets/${e.address}`} className="grid grid-cols-[62px_46px_1fr] items-center gap-x-3 px-4 py-2.5 font-mono text-[11.5px] transition-colors hover:bg-ink/3 sm:grid-cols-[62px_52px_1fr_auto]">
              <span className="text-ink-4 tabular">{formatClock(e.timestamp)}</span>
              <span className="text-ink">{e.symbol}</span>
              <span className="flex items-center gap-1.5">
                <span className={STATUS[e.previous].text}>{e.previous}</span>
                <span className="text-ink-4">→</span>
                <span className={cn("flex items-center gap-1", STATUS[e.current].text)}>
                  <StatusGlyph status={e.current} size={11} />
                  {e.current}
                </span>
              </span>
              <span className="hidden text-right text-ink-3 sm:block">{e.reason}</span>
            </Link>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
