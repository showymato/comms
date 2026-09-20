"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EligibilityEvent, EventType } from "@/types";
import { LiveDot } from "@/components/ui/status";
import { eventService } from "@/lib/services";
import { formatClock } from "@/lib/format";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const TYPES: EventType[] = ["ELIGIBILITY_CHANGED", "ASSET_PAUSED", "ORACLE_UNAVAILABLE", "TRANSFER_RESTRICTED", "ASSET_REDEEMED", "ASSET_REACTIVATED"];

const TYPE_TONE: Record<EventType, string> = {
  ELIGIBILITY_CHANGED: "text-cyan",
  ASSET_PAUSED: "text-conditional",
  ORACLE_UNAVAILABLE: "text-unknown",
  TRANSFER_RESTRICTED: "text-ineligible",
  ASSET_REDEEMED: "text-ink-2",
  ASSET_REACTIVATED: "text-eligible",
};

export function EventStream({ initial, initialType, initialAsset }: { initial: EligibilityEvent[]; initialType?: string; initialAsset?: string }) {
  const [events, setEvents] = useState(initial);
  const [paused, setPaused] = useState(false);
  const [buffer, setBuffer] = useState<EligibilityEvent[]>([]);
  const [type, setType] = useState<EventType | "ALL">(TYPES.includes(initialType as EventType) ? (initialType as EventType) : "ALL");
  const [q, setQ] = useState(initialAsset ?? "");
  const pausedRef = useRef(paused);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(
    () =>
      eventService.stream((e) => {
        setLiveCount((n) => n + 1);
        if (pausedRef.current) setBuffer((b) => [e, ...b]);
        else setEvents((p) => [e, ...p].slice(0, 200));
      }),
    [],
  );

  const resume = () => {
    setEvents((p) => [...buffer, ...p].slice(0, 200));
    setBuffer([]);
    setPaused(false);
  };

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => (type === "ALL" || e.type === type) && (!needle || e.symbol.toLowerCase().includes(needle) || e.address.toLowerCase().includes(needle)));
  }, [events, type, q]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1 sm:max-w-56">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter by asset symbol" placeholder="Asset, e.g. AAPL" className="h-9 w-full rounded-md border border-line bg-base-1 pr-3 pl-9 font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-3 focus:border-cyan/60" />
        </div>
        <button
          type="button"
          onClick={() => (paused ? resume() : setPaused(true))}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 font-mono text-[12px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? `Resume${buffer.length ? ` · ${buffer.length} new` : ""}` : "Pause"}
        </button>
      </div>

      <div role="group" aria-label="Filter by event type" className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["ALL", ...TYPES] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={cn("h-8 shrink-0 rounded-md border px-2.5 font-mono text-[10.5px] tracking-[0.05em] transition-colors", type === t ? "border-ink/25 bg-ink/8 text-ink" : "border-line text-ink-3 hover:border-line-2 hover:text-ink-2")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-base-1">
        <div className="flex items-center justify-between border-b border-line bg-ink/2 px-4 py-2.5 font-mono text-[11.5px]">
          <span className="text-ink-2">
            <span className="text-cyan">$</span> comms events --follow{paused ? "" : <span className="animate-blink text-ink-3"> ▌</span>}
          </span>
          <span className={cn("flex items-center gap-2", paused ? "text-conditional" : "text-eligible")}>
            {paused ? <span aria-hidden>‖</span> : <LiveDot />}
            {paused ? "PAUSED" : "LIVE · SIMULATED"}
          </span>
        </div>

        <div className="hidden grid-cols-[76px_64px_190px_minmax(0,1fr)_200px] gap-x-4 border-b border-line px-4 py-2 md:grid">
          {["Time (UTC)", "Asset", "Event", "Previous → new", "Reason"].map((h) => (
            <span key={h} className="label">{h}</span>
          ))}
        </div>

        <ol className="max-h-[calc(100svh-360px)] min-h-[320px] overflow-y-auto font-mono text-[12px]" aria-label="Event stream, newest first" aria-live="off">
          <AnimatePresence initial={false}>
            {visible.map((e) => (
              <motion.li
                key={e.id}
                layout="position"
                initial={{ opacity: 0, height: 0, backgroundColor: "rgba(84,214,255,0.12)" }}
                animate={{ opacity: 1, height: "auto", backgroundColor: "rgba(84,214,255,0)" }}
                transition={{ duration: 0.45, backgroundColor: { duration: 1.6 } }}
                className="overflow-hidden border-b border-line/60 last:border-0"
              >
                <Link href={`/app/assets/${e.address}`} className="grid grid-cols-[64px_1fr] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-ink/3 md:grid-cols-[76px_64px_190px_minmax(0,1fr)_200px]">
                  <span className="text-ink-4 tabular">{formatClock(e.timestamp)}</span>
                  <span className="font-medium text-ink">{e.symbol}</span>
                  <span className={cn("col-span-2 md:col-span-1", TYPE_TONE[e.type])}>{e.type}</span>
                  <span className="col-span-2 flex items-center gap-2 md:col-span-1">
                    <span className={STATUS[e.previous].text}>{e.previous}</span>
                    <span className="text-ink-4" aria-hidden>→</span>
                    <span className="sr-only">changed to</span>
                    <span className={STATUS[e.current].text}>{e.current}</span>
                  </span>
                  <span className="col-span-2 truncate text-ink-3 md:col-span-1">{e.reason}</span>
                </Link>
              </motion.li>
            ))}
          </AnimatePresence>
          {visible.length === 0 ? <li className="px-4 py-12 text-center text-ink-3">No events match the current filters.</li> : null}
        </ol>

        <div className="flex justify-between border-t border-line px-4 py-2 font-mono text-[10.5px] text-ink-4">
          <span>{visible.length} shown · {liveCount} received this session</span>
          <span>Demo stream</span>
        </div>
      </div>
    </div>
  );
}
