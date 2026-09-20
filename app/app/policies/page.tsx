import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { LivePolicyWorkspace } from "@/components/policies/live-policy-workspace";
import { ModeBadge } from "@/components/live/badges";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage({ searchParams }: { searchParams: Promise<{ asset?: string; policy?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Policy studio"
        description="Set the requirements your protocol needs. Every asset is evaluated against them, deterministically."
        actions={<ModeBadge className="sm:hidden" />}
      />
      <LivePolicyWorkspace initialAsset={sp.asset} initialPolicy={sp.policy} />
    </div>
  );
}
