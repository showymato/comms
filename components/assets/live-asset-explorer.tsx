"use client";

import { RefreshCw } from "lucide-react";
import { Panel, Skeleton } from "@/components/ui/primitives";
import { HealthTag } from "@/components/live/badges";
import { useAssets } from "@/hooks/use-live";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { liveManager } from "@/lib/data/live-manager";
import { AssetExplorer } from "./asset-explorer";

/** Feeds the explorer from the live registry. Loading and failure are shown in place; the page never goes blank. */
export function LiveAssetExplorer() {
  const { assets, loading, error } = useAssets();
  const health = useSliceHealthFor("registry");

  if (assets.length === 0) {
    return (
      <Panel className="p-6" aria-busy={loading}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <HealthTag health={health} />
            <p className="mt-3 font-mono text-[13px] text-ink">LIVE DATA DEGRADED</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-2">
              Robinhood asset registry: unable to retrieve current data{error ? ` (${error})` : ""}. No last successful update is available yet.
            </p>
            <button type="button" onClick={() => liveManager().refresh("registry")} className="mt-4 inline-flex items-center gap-1.5 font-mono text-[12px] text-cyan hover:text-ink">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}
      </Panel>
    );
  }
  return <AssetExplorer assets={assets} />;
}
