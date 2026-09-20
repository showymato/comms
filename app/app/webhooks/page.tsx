import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoTag } from "@/components/ui/primitives";
import { LiveWebhookConsole } from "@/components/webhooks/live-webhook-console";
import { WebhookConsole } from "@/components/webhooks/webhook-console";
import { DATA_MODE } from "@/lib/data/config";

export const metadata: Metadata = { title: "Webhooks" };

export default function WebhooksPage() {
  const demo = DATA_MODE === "demo";
  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        title="Webhooks"
        description="Register an endpoint, send a real signed test delivery, and inspect the HTTP status, latency and payload."
        actions={demo ? <DemoTag /> : null}
      />
      {demo ? (
        <>
          <p role="note" className="mb-4 rounded-md border border-conditional/30 bg-conditional/10 px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed text-ink-2">
            <span className="text-conditional">DEMO ENVIRONMENT</span> — endpoints and deliveries below are simulated.
          </p>
          <WebhookConsole />
        </>
      ) : (
        <>
          <p role="note" className="mb-8 max-w-3xl text-[13px] leading-relaxed text-ink-3">
            Endpoints are stored in this browser. COMMS has no persistent delivery pipeline yet: it does not push events on its own. What it can do is send an on-demand, HMAC-signed test request to your https endpoint and report exactly what your server returned — every row below is a request that really happened.
          </p>
          <LiveWebhookConsole />
        </>
      )}
    </div>
  );
}
