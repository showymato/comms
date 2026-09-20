import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { CopyButton } from "@/components/ui/code-block";
import { DemoTag, Panel, PanelHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Settings" };

const KEYS = [
  { name: "Production", value: "comms_live_demo_4f9a…c21e", created: "12 Aug 2026" },
  { name: "Staging", value: "comms_test_demo_81b7…09d3", created: "30 Aug 2026" },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Settings" description="Organization, API keys and data mode." actions={<DemoTag className="sm:hidden" />} />

      <Panel>
        <PanelHeader title="Organization" />
        <dl className="divide-y divide-line text-[13.5px]">
          {[["Name", "Demo Protocol"], ["Contact", "demo@protocol.example"], ["Default network", "RH Chain"], ["Default policy", "DEFAULT"]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-3">
              <dt className="text-ink-3">{k}</dt>
              <dd className="font-mono text-[12.5px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel>
        <PanelHeader title="API keys" meta={<span className="font-mono">Illustrative values</span>} />
        <ul className="divide-y divide-line">
          {KEYS.map((k) => (
            <li key={k.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-[13.5px] text-ink">{k.name}</div>
                <div className="font-mono text-[11px] text-ink-4">Created {k.created}</div>
              </div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-[12px] text-ink-2">{k.value}</code>
                <CopyButton text={k.value} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader title="Data mode" />
        <div className="space-y-3 p-4 text-[13.5px] leading-relaxed text-ink-2">
          <p>
            This build runs on <span className="text-conditional">simulated demo data</span>. Assets, addresses, liquidity, events and webhook deliveries are generated, and nothing is read from a chain.
          </p>
          <p>
            Every screen reads through five service interfaces (<code className="font-mono text-[12px] text-ink">assetService</code>, <code className="font-mono text-[12px] text-ink">eligibilityService</code>, <code className="font-mono text-[12px] text-ink">policyService</code>, <code className="font-mono text-[12px] text-ink">eventService</code>, <code className="font-mono text-[12px] text-ink">webhookService</code>). Connecting the REST API means implementing those interfaces; no screen changes.
          </p>
        </div>
      </Panel>
    </div>
  );
}
