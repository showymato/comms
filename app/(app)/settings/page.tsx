import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataSources } from "@/components/live/data-sources";
import { ModeBadge } from "@/components/live/badges";
import { DemoTag, Panel, PanelHeader } from "@/components/ui/primitives";
import { DATA_MODE } from "@/lib/data/config";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Settings" description="Data sources, organization and data mode." actions={<ModeBadge className="sm:hidden" />} />

      <DataSources />

      <Panel>
        <PanelHeader title="Data mode" meta={<span className="font-mono">{DATA_MODE.toUpperCase()}</span>} />
        <div className="space-y-3 p-4 text-[13.5px] leading-relaxed text-ink-2">
          <p>
            <code className="font-mono text-[12px] text-ink">NEXT_PUBLIC_DATA_MODE</code> selects where data comes from:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[13px]">
            <li>
              <span className="font-mono text-ink">live</span> (default) — Robinhood registry, prices and corporate actions, plus Robinhood Chain reads. Anything COMMS cannot verify is UNKNOWN.
            </li>
            <li>
              <span className="font-mono text-ink">hybrid</span> — live data, with checks that no live source can supply filled in and badged <span className="font-mono text-conditional">DEMO</span>.
            </li>
            <li>
              <span className="font-mono text-ink">demo</span> — the built-in simulated dataset, labelled DEMO MODE everywhere.
            </li>
          </ul>
          <p className="text-ink-3">
            Webhook endpoints and deliveries, and the event stream in demo mode, are simulated: COMMS has no webhook backend or persistent event store yet.
          </p>
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Organization" meta={<DemoTag />} />
        <dl className="divide-y divide-line text-[13.5px]">
          {[["Name", "Demo Protocol"], ["Contact", "demo@protocol.example"], ["Default network", "RH Chain"], ["Default policy", "DEFAULT"]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3">
              <dt className="text-ink-3">{k}</dt>
              <dd className="font-mono text-[12.5px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
