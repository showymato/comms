"use client";

import { Panel, Skeleton } from "@/components/ui/primitives";
import { useAssets } from "@/hooks/use-live";
import { PolicyWorkspace } from "./policy-workspace";

export function LivePolicyWorkspace({ initialAsset, initialPolicy }: { initialAsset?: string; initialPolicy?: string }) {
  const { assets, loading } = useAssets();
  if (assets.length === 0) {
    return (
      <Panel className="p-6" aria-busy={loading}>
        {loading ? <Skeleton className="h-40" /> : <p className="font-mono text-[13px] text-ink-2">LIVE DATA DEGRADED — the asset registry is unavailable, so policies cannot be tested against assets right now.</p>}
      </Panel>
    );
  }
  return <PolicyWorkspace assets={assets} initialAsset={initialAsset} initialPolicy={initialPolicy} />;
}
