import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AssetChecker } from "@/components/eligibility/asset-checker";
import { RecentRuns } from "@/components/eligibility/recent-runs";
import { ModeBadge } from "@/components/live/badges";

export const metadata: Metadata = { title: "Eligibility check" };

export default function EligibilityPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <PageHeader
        title="Check an asset"
        description="Run the deterministic eligibility checks against a token and a policy. Same state in, same answer out."
        actions={<ModeBadge className="sm:hidden" />}
      />
      <AssetChecker showLink />
      <RecentRuns />
    </div>
  );
}
