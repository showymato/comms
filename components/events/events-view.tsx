"use client";

import { EventTimeline } from "@/components/live/event-timeline";
import { CorporateActions } from "@/components/live/corporate-actions";
import { HealthTag } from "@/components/live/badges";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { seedEvents } from "@/data/events";
import { DATA_MODE } from "@/lib/data/config";
import { EventStream } from "./event-stream";

/**
 * Live / hybrid: only events COMMS actually observed (real requests, real diffs) plus real corporate actions.
 * Demo: the simulated stream, clearly labelled.
 */
export function EventsView({ initialType, initialAsset }: { initialType?: string; initialAsset?: string }) {
  if (DATA_MODE === "demo") return <EventStream initial={seedEvents()} initialType={initialType} initialAsset={initialAsset} />;
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title={initialAsset ? `Observed events · ${initialAsset}` : "Observed events"} meta={<HealthTag health="ON_DEMAND" />} />
        <EventTimeline symbol={initialAsset} limit={100} />
      </Panel>
      <CorporateActions symbol={initialAsset} />
    </div>
  );
}
