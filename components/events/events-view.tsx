"use client";

import { useState } from "react";
import { CorporateActions } from "@/components/live/corporate-actions";
import { EventTimeline } from "@/components/live/event-timeline";
import { seedEvents } from "@/data/events";
import { DATA_MODE } from "@/lib/data/config";
import { cn } from "@/lib/utils";
import { ChainEventStream } from "./chain-event-stream";
import { EventStream } from "./event-stream";

/**
 * Live / hybrid: the real event feed (onchain logs + corporate actions), plus what this session observed by diffing
 * successive real readings. Demo: the simulated stream, clearly labelled.
 */
export function EventsView({ initialType, initialAsset }: { initialType?: string; initialAsset?: string }) {
  const [tab, setTab] = useState<"chain" | "session">("chain");
  if (DATA_MODE === "demo") return <EventStream initial={seedEvents()} initialType={initialType} initialAsset={initialAsset} />;
  return (
    <div className="space-y-12">
      <div>
        <div role="tablist" aria-label="Event source" className="mb-4 flex gap-6 border-b border-line">
          {(
            [
              ["chain", "Chain & registry"],
              ["session", "Observed by COMMS"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn("-mb-px border-b-2 pb-3 font-mono text-[11.5px] tracking-[0.08em] uppercase transition-colors", tab === k ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "chain" ? (
          <ChainEventStream symbol={initialAsset} />
        ) : (
          <div>
            <p className="mb-2 max-w-2xl text-[13px] leading-relaxed text-ink-3">
              Changes COMMS itself noticed by comparing successive real readings — price updates, contract state, eligibility changes. They exist for this browser session only; COMMS has no persistent event store yet.
            </p>
            <EventTimeline symbol={initialAsset} limit={100} />
          </div>
        )}
      </div>
      <CorporateActions symbol={initialAsset} />
    </div>
  );
}
