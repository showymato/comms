import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventsView } from "@/components/events/events-view";
import { ModeBadge } from "@/components/live/badges";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ asset?: string; type?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Events" description="What COMMS has observed: price updates, state checks, eligibility evaluations and changes, and corporate actions." actions={<ModeBadge className="sm:hidden" />} />
      <EventsView initialType={sp.type} initialAsset={sp.asset} />
    </div>
  );
}
