import type { Metadata } from "next";
import { AssetExplorer } from "@/components/assets/asset-explorer";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoTag } from "@/components/ui/primitives";
import { assetService } from "@/lib/services";

export const metadata: Metadata = { title: "Assets" };

export default async function AssetsPage() {
  const assets = await assetService.list();
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Asset registry"
        description="Every supported Stock Token, its current state and its collateral eligibility under the selected policy."
        actions={<DemoTag className="sm:hidden" />}
      />
      <AssetExplorer assets={assets} />
    </div>
  );
}
