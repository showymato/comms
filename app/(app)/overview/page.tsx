import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HourlyColumns, StatusBar } from "@/components/dashboard/charts";
import { LiveDecisions, MetricStrip, SystemHealth } from "@/components/dashboard/overview-widgets";
import { PageHeader } from "@/components/dashboard/page-header";
import { DemoTag, Panel, PanelHeader } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status";
import { seedEvents } from "@/data/events";
import { assetService, eligibilityService, policyService } from "@/lib/services";
import { prng } from "@/lib/prng";
import { shortAddress } from "@/lib/format";
import { STATUS_ORDER } from "@/lib/status";
import type { EligibilityStatus } from "@/types";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const [assets, policy] = await Promise.all([assetService.list(), policyService.get("DEFAULT")]);
  const results = assets.map((a) => ({ a, r: eligibilityService.evaluate(a, policy!) }));
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, results.filter((x) => x.r.status === s).length])) as Record<EligibilityStatus, number>;
  const attention = results.filter((x) => x.r.status !== "ELIGIBLE");

  const rand = prng(11);
  const hourly = Array.from({ length: 24 }, (_, i) => Math.max(0, Math.round(1 + rand() * 5 + (i > 14 && i < 20 ? 3 : 0) - (i < 5 ? 2 : 0))));

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <PageHeader
        title="Eligibility Overview"
        description="Real-time collateral intelligence across supported assets."
        actions={<DemoTag className="sm:hidden" />}
      />

      <MetricStrip total={assets.length} counts={counts} />
      <SystemHealth />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Status distribution" meta={<span className="font-mono">Policy · DEFAULT</span>} />
            <div className="p-4">
              <StatusBar counts={counts} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Status changes · last 24 hours" meta={<span className="font-mono">UTC · hourly</span>} />
            <div className="p-4">
              <HourlyColumns values={hourly} startHour={22} />
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Live decisions" meta={<span className="flex items-center gap-1.5 font-mono"><span className="size-1.5 animate-pulse rounded-full bg-cyan" aria-hidden />Simulated stream</span>} />
            <LiveDecisions initial={seedEvents().slice(0, 7)} />
          </Panel>
        </div>

        <Panel className="self-start">
          <PanelHeader title="Needs attention" meta={<span className="font-mono">{attention.length} assets</span>} />
          <ul>
            {attention.map(({ a, r }) => (
              <li key={a.address} className="border-b border-line last:border-0">
                <Link href={`/assets/${a.address}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/3">
                  <span className="w-12 font-mono text-[13px] font-medium text-ink">{a.symbol}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px] text-ink-3">{r.reasons.join(", ")}</span>
                    <span className="block font-mono text-[10.5px] text-ink-4">{shortAddress(a.address)}</span>
                  </span>
                  <StatusBadge status={r.status} size="sm" />
                  <ArrowUpRight size={13} className="text-ink-4 transition-colors group-hover:text-ink" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
