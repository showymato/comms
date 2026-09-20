import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoTag } from "@/components/ui/primitives";
import { WebhookConsole } from "@/components/webhooks/webhook-console";

export const metadata: Metadata = { title: "Webhooks" };

export default function WebhooksPage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Webhooks" description="Receive an event the moment an asset's eligibility changes. Inspect every delivery and payload." actions={<DemoTag className="sm:hidden" />} />
      <WebhookConsole />
    </div>
  );
}
