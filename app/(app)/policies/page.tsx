import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { PolicyWorkspace } from "@/components/policies/policy-workspace";
import { DemoTag } from "@/components/ui/primitives";
import { assetService } from "@/lib/services";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ asset?: string; policy?: string }> }) {
  const [assets, sp] = await Promise.all([assetService.list(), searchParams]);
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Policies"
        description="Set the requirements your protocol needs. Every asset is evaluated against them, deterministically."
        actions={<DemoTag className="sm:hidden" />}
      />
      <PolicyWorkspace assets={assets} initialAsset={sp.asset} initialPolicy={sp.policy} />
    </div>
  );
}
