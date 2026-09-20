"use client";

import { motion } from "motion/react";
import { Table2, BarChart3 } from "lucide-react";
import { useState } from "react";
import type { EligibilityStatus } from "@/types";
import { StatusGlyph } from "@/components/ui/status";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/utils";

/* ─────────── Status distribution: one stacked bar, 2px surface gaps, legend + tooltip ─────────── */

export function StatusBar({ counts }: { counts: Record<EligibilityStatus, number> }) {
  const total = STATUS_ORDER.reduce((n, s) => n + counts[s], 0);
  const [hover, setHover] = useState<EligibilityStatus | null>(null);

  return (
    <div>
      <div className="relative flex h-6 gap-0.5" role="img" aria-label={STATUS_ORDER.map((s) => `${counts[s]} ${s.toLowerCase()}`).join(", ")}>
        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s, i, arr) => (
          <motion.button
            key={s}
            type="button"
            aria-label={`${s}: ${counts[s]} of ${total} assets`}
            onPointerEnter={() => setHover(s)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(s)}
            onBlur={() => setHover(null)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: `${(counts[s] / total) * 100}%`, originX: 0, background: STATUS[s].hex, opacity: hover && hover !== s ? 0.45 : 1 }}
            className={cn("h-full transition-opacity duration-150", i === 0 && "rounded-l-[4px]", i === arr.length - 1 && "rounded-r-[4px]")}
          />
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4" aria-label="Legend">
        {STATUS_ORDER.map((s) => (
          <li key={s} className={cn("flex items-center gap-2 transition-opacity", hover && hover !== s && "opacity-50")}>
            <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ background: STATUS[s].hex }} />
            <span className="flex items-center gap-1 font-mono text-[11px] tracking-[0.06em] text-ink-2">
              <StatusGlyph status={s} size={11} className={STATUS[s].text} />
              {s}
            </span>
            <span className="ml-auto font-mono text-[12px] text-ink tabular">{counts[s]}</span>
            <span className="w-9 text-right font-mono text-[11px] text-ink-3 tabular">{total ? Math.round((counts[s] / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────── Hourly column chart with hover tooltip + table view ─────────── */

export function HourlyColumns({ values, startHour }: { values: number[]; startHour: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(4, Math.ceil(Math.max(...values) / 4) * 4);
  const ticks = [0, max / 2, max];
  const hourOf = (i: number) => `${String((startHour + i) % 24).padStart(2, "0")}:00`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setTable((t) => !t)}
          aria-pressed={table}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 font-mono text-[11px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
        >
          {table ? <BarChart3 size={12} /> : <Table2 size={12} />} {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-56 overflow-y-auto rounded-md border border-line">
          <table className="w-full text-left font-mono text-[12px]">
            <caption className="sr-only">Status changes per hour, last 24 hours (UTC)</caption>
            <thead className="sticky top-0 bg-surface-2 text-ink-3">
              <tr>
                <th scope="col" className="px-3 py-1.5 font-normal">Hour (UTC)</th>
                <th scope="col" className="px-3 py-1.5 text-right font-normal">Changes</th>
              </tr>
            </thead>
            <tbody>
              {values.map((v, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="px-3 py-1 text-ink-2">{hourOf(i)}</td>
                  <td className="px-3 py-1 text-right text-ink tabular">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pl-7">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex w-6 flex-col justify-between pb-6 text-right font-mono text-[10px] text-ink-4">
            {[...ticks].reverse().map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="relative h-44">
            {ticks.map((t) => (
              <span key={t} aria-hidden className="pointer-events-none absolute inset-x-0 h-px bg-ink/[0.06]" style={{ bottom: `calc(24px + ${t / max} * (100% - 24px))` }} />
            ))}
            <div className="absolute inset-x-0 top-0 bottom-6 flex items-end gap-0.5" role="list" aria-label="Status changes per hour">
              {values.map((v, i) => (
                <div
                  key={i}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${hourOf(i)} UTC: ${v} status changes`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-ink/4"
                >
                  <motion.div
                    className={cn("w-full max-w-6 rounded-t-[4px] transition-colors", hover === i ? "bg-[#8fe4ff]" : "bg-cyan/80")}
                    initial={{ height: 0 }}
                    animate={{ height: `${(v / max) * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.015, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {hover === i ? (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-1 -translate-y-0.5 rounded-md border border-line-2 bg-base-2 px-2.5 py-1.5 whitespace-nowrap shadow-xl" style={{ left: i > values.length - 5 ? "auto" : "50%", right: i > values.length - 5 ? 0 : "auto", transform: i > values.length - 5 ? undefined : "translateX(-50%)" }}>
                      <div className="font-mono text-[13px] font-medium text-ink tabular">{v} changes</div>
                      <div className="font-mono text-[10.5px] text-ink-3">{hourOf(i)} UTC</div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-6 items-end gap-0.5 font-mono text-[10px] text-ink-4" aria-hidden>
              {values.map((_, i) => (
                <span key={i} className="flex-1 text-center">
                  {i % 6 === 0 ? hourOf(i).slice(0, 2) : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
