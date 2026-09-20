"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { HourlyColumns, StatusBar } from "@/components/dashboard/charts";
import { LiveDecisions } from "@/components/dashboard/overview-widgets";
import { FreshnessTag, ModeBadge } from "@/components/live/badges";
import { EventTimeline } from "@/components/live/event-timeline";
import { Metric } from "@/components/live/metric";
import { StatusList } from "@/components/live/status-list";
import { ChainBlock, SystemStatusPanel } from "@/components/live/status-panel";
import { DemoTag, Skeleton } from "@/components/ui/primitives";
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
import type { EligibilityStatus } from "@/types";

/** A flat section: a heavy top rule, a mono label, no box. */
function Sec({ title, meta, children }: { title: ReactNode; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ink/80">
      <div className="flex items-center justify-between gap-3 py-3">
        <h2 className="label !text-ink">{title}</h2>
        {meta ? <div className="font-mono text-[11px] text-ink-3">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Header({ actions }: { actions?: ReactNode }) {
  return (
    <header className="pb-10 lg:pb-14">
      <div className="label flex flex-wrap items-center gap-3">
        <span className="text-ink">COMMS</span>
        <span aria-hidden className="h-px w-8 bg-line-2" />
        <span>Overview</span>
        <span className="ml-auto flex items-center gap-3">{actions}</span>
      </div>
      <h1 className="display display-lg mt-6 max-w-[16ch] text-ink uppercase">Collateral intelligence</h1>
    </header>
  );
}

/** Overview built from the registry as it actually is. Numbers are counts of real assets; coverage is stated, not implied. */
export function OverviewLive() {
  const { assets, loading, error } = useAssets();
  const policies = useStore(policyService.state);
  const policy = policies.find((p) => p.id === "DEFAULT") ?? policies[0];
  const prices = useLive((s) => s.prices);
  const chain = useLive((s) => s.chain);
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
  const top = results.filter((x) => x.a.live?.lifecycle === "ACTIVE").sort((x, y) => x.a.symbol.localeCompare(y.a.symbol)).slice(0, 10);

  const rand = prng(11);
  const hourly = Array.from({ length: 24 }, (_, i) => Math.max(0, Math.round(1 + rand() * 5 + (i > 14 && i < 20 ? 3 : 0) - (i < 5 ? 2 : 0))));

  if (total === 0) {
    return (
      <div className="mx-auto max-w-[1280px]">
        <Header actions={<ModeBadge />} />
        <Sec title="Registry">
          <div aria-busy={loading} className="pb-8">
            {loading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : (
              <p className="font-mono text-[13px] text-ink-2">LIVE DATA DEGRADED — the Robinhood asset registry could not be loaded{error ? `: ${error}` : ""}.</p>
            )}
          </div>
        </Sec>
        <div className="mt-8">
          <SystemStatusPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <Header
        actions={
          <>
            <ChainBlock className="hidden sm:inline-flex" />
            <ModeBadge />
          </>
        }
      />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-9 border-t border-ink/80 pt-6 pb-12 sm:grid-cols-3 xl:grid-cols-6">
        <Metric size="lg" label="Live assets" value={total} state="ok" source={demo ? "Demo" : "Robinhood"} />
        <Metric size="lg" label="Active" value={demo ? total - counts.INELIGIBLE : active} state="ok" source={demo ? "Demo" : "Robinhood"} hint={inactive ? `${inactive} inactive` : undefined} />
        <Metric size="lg" label="Live prices" value={demo ? null : priced} state={demo ? "unknown" : "ok"} source="Robinhood" hint={demo ? undefined : `of ${total}`} />
        <Metric size="lg" label="Chain-verified" value={demo ? null : chainRead} state={demo ? "unknown" : "ok"} source="Onchain" hint={demo ? undefined : `of ${total} · paused()`} />
        <Metric size="lg" label="Decided" value={decided} state="ok" source="COMMS" hint={`of ${total}`} />
        <Metric size="lg" label="Unknown" value={counts.UNKNOWN} state="ok" source="COMMS" hint={`${Math.round((counts.UNKNOWN / total) * 100)}%`} />
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-10 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-10">
          <Sec title="Status distribution" meta={`Policy · ${policy.name}`}>
            <div className="pb-2">
              <StatusBar counts={counts} />
              {!demo && counts.UNKNOWN > 0 ? (
                <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-ink-3">UNKNOWN is a result, not an error: for these assets at least one required check has no verified evidence. Nothing is guessed to fill the gap.</p>
              ) : null}
            </div>
          </Sec>

          <Sec title="Live registry" meta={<Link href="/app/assets" className="inline-flex items-center gap-1 text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">All {total} assets <ArrowUpRight size={12} /></Link>}>
            <ul>
              {top.map(({ a, r }) => (
                <li key={a.address} className="border-t border-line">
                  <Link href={`/app/assets/${a.symbol}`} prefetch={false} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 py-3 transition-[padding,background-color] duration-300 hover:bg-ink/[0.03] hover:py-4">
                    <span className="text-[15px] font-medium tracking-[-0.02em] text-ink">{a.symbol}</span>
                    <span className="truncate text-[13px] text-ink-3">{a.name}</span>
                    <StatusBadge status={r.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </Sec>

          <Sec title="Evidence coverage by check" meta={demo ? "demo" : `${total} assets`}>
            <ul>
              {gaps.map((g) => (
                <li key={g.id} className="grid grid-cols-[minmax(0,1fr)_140px_72px] items-center gap-3 border-t border-line py-2.5 text-[13px]">
                  <span className="text-ink-2">{g.label}</span>
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-ink/8">
                    <span className="block h-full rounded-full bg-signal" style={{ width: `${total ? ((total - g.unknown) / total) * 100 : 0}%` }} />
                  </span>
                  <span className="text-right font-mono text-[11px] text-ink-3 tabular">{total - g.unknown === 0 ? "UNKNOWN" : `${total - g.unknown} / ${total}`}</span>
                </li>
              ))}
            </ul>
          </Sec>

          {demo ? (
            <>
              <Sec title="Status changes · last 24 hours" meta={<DemoTag />}>
                <HourlyColumns values={hourly} startHour={22} />
              </Sec>
              <Sec title="Live decisions" meta={<DemoTag />}>
                <LiveDecisions initial={seedEvents().slice(0, 7)} />
              </Sec>
            </>
          ) : (
            <Sec title="Observed events" meta="this session · real observations only">
              <EventTimeline limit={8} />
            </Sec>
          )}
        </div>

        <div className="space-y-10 self-start">
          <div>
            {demo ? <SystemStatusPanel /> : <StatusList />}
            {!demo ? (
              <div className="mt-3 flex items-center justify-between font-mono text-[10.5px] text-ink-3">
                <span>PRICE FEED SYNC</span>
                <FreshnessTag at={prices.fetchedAt} kind="price" />
              </div>
            ) : null}
            {chain.data ? <div className="mt-1 flex items-center justify-between font-mono text-[10.5px] text-ink-3"><span>BLOCK TIME</span><span>{chain.data.blockTime.slice(11, 19)} UTC</span></div> : null}
          </div>

          <Sec title={demo ? "Needs attention" : "Not eligible"} meta={`${attention.length} assets`}>
            {attention.length === 0 ? (
              <p className="py-4 font-mono text-[12px] text-ink-3">{demo ? "Nothing needs attention." : "No asset currently fails a verified required check."}</p>
            ) : (
              <ul>
                {attention.slice(0, 12).map(({ a, r }) => (
                  <li key={a.address} className="border-t border-line">
                    <Link href={`/app/assets/${a.symbol}`} prefetch={false} className="group flex items-center gap-3 py-3 transition-colors hover:bg-ink/3">
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
          </Sec>
        </div>
      </div>
    </div>
  );
}
