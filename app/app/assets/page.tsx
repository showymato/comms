import type { Metadata } from "next";
import { LiveAssetExplorer } from "@/components/assets/live-asset-explorer";
import { PageHeader } from "@/components/dashboard/page-header";
import { ModeBadge } from "@/components/live/badges";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Asset registry"
        description="Every Stock Token in the Robinhood registry, its current state and its collateral eligibility under the selected policy."
        actions={<ModeBadge className="sm:hidden" />}
      />
      <LiveAssetExplorer />
    </div>
  );
}
