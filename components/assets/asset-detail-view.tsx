"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Panel, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useAsset, useWatchSymbol } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { eligibilityService } from "@/lib/services";
import type { EligibilityEvent } from "@/types";
import { AssetDetail } from "./asset-detail";

/**
 * Resolves the asset from the live registry (or the labelled demo set) and keeps its quote and contract
 * read polling while the page is open. Registry rows are looked up by address or symbol.
 */
export function AssetDetailView({ address }: { address: string }) {
  const { asset, loading, error } = useAsset(address);
  useWatchSymbol(asset?.live ? asset.symbol : null);
  const [history, setHistory] = useState<EligibilityEvent[]>([]);

  useEffect(() => {
    if (DATA_MODE !== "demo" || !asset) return;
    let alive = true;
    void eligibilityService.history(asset.address).then((h) => alive && setHistory(h));
    return () => {
      alive = false;
    };
  }, [asset]);

  if (!asset) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <Link href="/assets" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-3 transition-colors hover:text-ink">
          <ChevronLeft size={14} /> Assets
        </Link>
        {loading ? (
          <div className="space-y-4" aria-busy>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-52 w-full" />
          </div>
        ) : (
          <Panel className="p-8 text-center">
            <p className="font-mono text-[13px] text-ink">{error ? "LIVE DATA DEGRADED" : "ASSET NOT IN REGISTRY"}</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] text-ink-2">
              {error
                ? `The Robinhood asset registry could not be loaded: ${error}`
                : `"${address}" is not a Stock Token in the Robinhood registry. COMMS reports UNKNOWN for addresses it has no evidence for.`}
            </p>
            <Button href="/eligibility" variant="secondary" className="mt-5">
              Run an eligibility check
            </Button>
          </Panel>
        )}
      </div>
    );
  }
  return <AssetDetail asset={asset} history={history} />;
}
