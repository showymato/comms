import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { EventStream } from "@/components/events/event-stream";
import { DemoTag } from "@/components/ui/primitives";
import { eventService } from "@/lib/services";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ asset?: string; type?: string }> }) {
  const [initial, sp] = await Promise.all([eventService.list(), searchParams]);
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Events" description="Every change of eligibility status, as it happens: what changed, from what, to what, and why." actions={<DemoTag className="sm:hidden" />} />
      <EventStream initial={initial} initialType={sp.type} initialAsset={sp.asset} />
    </div>
  );
}
