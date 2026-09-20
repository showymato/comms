import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoTag } from "@/components/ui/primitives";
import { WebhookConsole } from "@/components/webhooks/webhook-console";

export const metadata: Metadata = { title: "Webhooks" };

export default function WebhooksPage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader title="Webhooks" description="Receive an event the moment an asset's eligibility changes. Inspect every delivery and payload." actions={<DemoTag />} />
      <p role="note" className="mb-4 rounded-md border border-conditional/25 bg-conditional/8 px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed text-ink-2">
        <span className="text-conditional">DEMO DATA</span> — COMMS has no webhook backend or persistent event store connected yet. Endpoints and deliveries below are simulated in every data mode.
      </p>
      <WebhookConsole />
    </div>
  );
}
