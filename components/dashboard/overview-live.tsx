"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { HourlyColumns, StatusBar } from "@/components/dashboard/charts";
import { LiveDecisions } from "@/components/dashboard/overview-widgets";
import { PageHeader } from "@/components/dashboard/page-header";
import { FreshnessTag, ModeBadge } from "@/components/live/badges";
import { EventTimeline } from "@/components/live/event-timeline";
import { ChainBlock, SystemStatusPanel } from "@/components/live/status-panel";
import { CountUp } from "@/components/ui/motion-bits";
import { DemoTag, Panel, PanelHeader, Skeleton } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status";
import { seedEvents } from "@/data/events";
import { useAssets, useLive } from "@/hooks/use-live";
import { useStore } from "@/hooks/use-store";
import { DATA_MODE } from "@/lib/data/config";
import { CHECK_SPECS } from "@/lib/engine";
import { shortAddress } from "@/lib/format";
import { prng } from "@/lib/prng";
import { eligibilityService, policyService } from "@/lib/services";
import { STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { EligibilityStatus } from "@/types";

function Metric({ label, value, sub, className }: { label: string; value: number | string; sub?: string; className?: string }) {
  return (
    <div className={cn("bg-surface/90 px-4 py-3.5", className)}>
      <dt className="label">{label}</dt>
      <dd className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink">{typeof value === "number" ? <CountUp to={value} /> : value}</span>
        {sub ? <span className="font-mono text-[11px] text-ink-3">{sub}</span> : null}
      </dd>
    </div>
  );
}

/** Overview built from the registry as it actually is. Numbers are counts of real assets; coverage is stated, not implied. */
export function OverviewLive() {
  const { assets, loading, error } = useAssets();
  const policies = useStore(policyService.state);
  const policy = policies.find((p) => p.id === "DEFAULT") ?? policies[0];
  const prices = useLive((s) => s.prices);
  const demo = DATA_MODE === "demo";

  const results = useMemo(() => assets.map((a) => ({ a, r: eligibilityService.evaluate(a, policy) })), [assets, policy]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<EligibilityStatus, number>;
    results.forEach((x) => c[x.r.status]++);
    return c;
  }, [results]);

  const gaps = useMemo(
    () => CHECK_SPECS.map((s) => ({ id: s.id, label: s.label, unknown: results.filter((x) => x.r.checks.find((c) => c.id === s.id)!.result === "UNKNOWN").length })),
    [results],
  );

  const total = assets.length;
  const active = assets.filter((a) => a.live?.lifecycle === "ACTIVE").length;
  const inactive = assets.filter((a) => a.live?.lifecycle === "INACTIVE").length;
  const priced = assets.filter((a) => a.live?.price).length;
  const chainRead = assets.filter((a) => a.state.paused.source === "ONCHAIN" && a.state.paused.value !== null).length;
  const decided = counts.ELIGIBLE + counts.INELIGIBLE + counts.CONDITIONAL;
  const attention = results.filter((x) => x.r.status === "INELIGIBLE" || x.r.status === "CONDITIONAL");

  const rand = prng(11);
  const hourly = Array.from({ length: 24 }, (_, i) => Math.max(0, Math.round(1 + rand() * 5 + (i > 14 && i < 20 ? 3 : 0) - (i < 5 ? 2 : 0))));

  if (total === 0) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-4">
        <PageHeader title="Eligibility Overview" description="Collateral intelligence across the Robinhood Stock Token registry." actions={<ModeBadge />} />
        <Panel className="p-6" aria-busy={loading}>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <p className="font-mono text-[13px] text-ink-2">LIVE DATA DEGRADED — the Robinhood asset registry could not be loaded{error ? `: ${error}` : ""}.</p>
          )}
        </Panel>
        <Panel className="p-4">
          <SystemStatusPanel />
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-4">
      <PageHeader
        title="Eligibility Overview"
        description={demo ? "Simulated collateral intelligence across demo assets." : "Collateral intelligence across the Robinhood Stock Token registry."}
        actions={
          <>
            <ChainBlock className="hidden sm:inline-flex" />
            <ModeBadge />
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 xl:grid-cols-6">
        <Metric label="Supported assets" value={total} />
        <Metric label="Active" value={demo ? total - counts.INELIGIBLE : active} sub={inactive ? `${inactive} inactive` : undefined} />
        <Metric label="Live prices" value={demo ? 0 : priced} sub={demo ? "n/a" : `of ${total}`} />
        <Metric label="Chain-verified" value={demo ? 0 : chainRead} sub={demo ? "n/a" : `of ${total} · paused()`} />
        <Metric label="Eligibility coverage" value={`${decided} / ${total}`} sub="decided" />
        <Metric label="Unknown eligibility" value={counts.UNKNOWN} sub={total ? `${Math.round((counts.UNKNOWN / total) * 100)}%` : undefined} />
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Status distribution" meta={<span className="font-mono">Policy · {policy.name}</span>} />
            <div className="p-4">
              <StatusBar counts={counts} />
              {!demo && counts.UNKNOWN > 0 ? (
                <p className="mt-4 text-[12.5px] leading-relaxed text-ink-3">
                  UNKNOWN is a result, not an error: for these assets at least one required check has no verified evidence. Nothing is guessed to fill the gap.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Evidence coverage by check" meta={<span className="font-mono">{demo ? "demo" : `${total} assets`}</span>} />
            <ul className="divide-y divide-line">
              {gaps.map((g) => (
                <li key={g.id} className="grid grid-cols-[minmax(0,1fr)_140px_64px] items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className="text-ink-2">{g.label}</span>
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-white/8">
                    <span className="block h-full rounded-full bg-cyan/70" style={{ width: `${total ? ((total - g.unknown) / total) * 100 : 0}%` }} />
                  </span>
                  <span className="text-right font-mono text-[11px] text-ink-3 tabular">
                    {total - g.unknown} / {total}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {demo ? (
            <>
              <Panel>
                <PanelHeader title="Status changes · last 24 hours" meta={<DemoTag />} />
                <div className="p-4">
                  <HourlyColumns values={hourly} startHour={22} />
                </div>
              </Panel>
              <Panel>
                <PanelHeader title="Live decisions" meta={<DemoTag />} />
                <LiveDecisions initial={seedEvents().slice(0, 7)} />
              </Panel>
            </>
          ) : (
            <Panel>
              <PanelHeader title="Observed events" meta={<span className="font-mono">this session · real observations only</span>} />
              <EventTimeline limit={8} />
            </Panel>
          )}
        </div>

        <div className="space-y-4 self-start">
          <Panel className="p-4">
            <SystemStatusPanel />
            {!demo ? (
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 font-mono text-[10.5px] text-ink-4">
                <span>PRICE FEED SYNC</span>
                <FreshnessTag at={prices.fetchedAt} kind="price" />
              </div>
            ) : null}
          </Panel>

          <Panel>
            <PanelHeader title={demo ? "Needs attention" : "Not eligible"} meta={<span className="font-mono">{attention.length} assets</span>} />
            {attention.length === 0 ? (
              <p className="px-4 py-5 font-mono text-[12px] text-ink-3">{demo ? "Nothing needs attention." : "No asset currently fails a verified required check."}</p>
            ) : (
              <ul>
                {attention.slice(0, 12).map(({ a, r }) => (
                  <li key={a.address} className="border-b border-line last:border-0">
                    <Link href={`/assets/${a.address}`} prefetch={false} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/3">
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
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
