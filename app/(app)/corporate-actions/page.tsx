import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { CorporateActions } from "@/components/live/corporate-actions";
import { ModeBadge } from "@/components/live/badges";

export const metadata: Metadata = { title: "Corporate actions" };

export default function CorporateActionsPage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Corporate actions"
        description="Splits, dividends, mergers and other actions reported by the Robinhood Stock Token API. Select an action for its full record."
        actions={<ModeBadge className="sm:hidden" />}
      />
      <CorporateActions />
    </div>
  );
}
