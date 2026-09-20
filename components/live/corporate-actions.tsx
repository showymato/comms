"use client";

import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { FreshnessTag, HealthTag, SourceBadge } from "@/components/live/badges";
import { useLive, useNowMs } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { liveManager, sliceHealth } from "@/lib/data/live-manager";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CorporateAction, CorporateActionType, RegistryAsset } from "@/types";

const TYPE_LABEL: Record<CorporateActionType, string> = {
  FORWARD_SPLIT: "Forward split",
  REVERSE_SPLIT: "Reverse split",
  CASH_DIVIDEND: "Cash dividend",
  STOCK_DIVIDEND: "Stock dividend",
  SPIN_OFF: "Spin-off",
  CASH_MERGER: "Cash merger",
  STOCK_MERGER: "Stock merger",
  REDEMPTION: "Redemption",
  NAME_CHANGE: "Name change",
  OTHER: "Other",
};

const dateLabel = (d: string | null) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "UNKNOWN";

/** The API value, as reported: split ratios "old → new", dividends as a per-token rate. Nothing is inferred. */
function summary(a: CorporateAction): string {
  if (a.oldRate !== null && a.newRate !== null) return `${a.oldRate} → ${a.newRate}`;
  if (a.rate !== null) return `${a.rate} ${a.type === "CASH_DIVIDEND" ? "per share" : ""}`.trim();
  return "See details";
}

function relative(d: string | null, now: number): string {
  if (!d || !now) return "";
  const days = Math.round((Date.parse(`${d}T00:00:00Z`) - now) / 86_400_000);
  return days === 0 ? "today" : days > 0 ? `in ${days}d` : `${-days}d ago`;
}

function Detail({ a }: { a: CorporateAction }) {
  const dep = a.deployments[0];
  const rows: Array<[string, React.ReactNode]> = [
    ["Type", a.rawType || "UNKNOWN"],
    ["Token", a.tokenSymbol],
    ["Underlying", a.underlyingSymbol ?? "UNKNOWN"],
    ["Old rate", a.oldRate ?? "—"],
    ["New rate", a.newRate ?? "—"],
    ["Rate", a.rate ?? "—"],
    ["Status", a.status],
    ["Process date", dateLabel(a.processDate)],
    ["Deployment", dep ? `${dep.networkName} · ${dep.chainId} · ${shortAddress(dep.contractAddress, 8, 6)}` : "UNKNOWN"],
  ];
  return (
    <div className="bg-ink/[0.025] px-3 py-4">
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] items-baseline gap-3">
            <dt className="label">{k}</dt>
            <dd className="font-mono text-[12.5px] break-all text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="label mt-4 mb-1.5">API details (unmodified)</div>
      <pre className="overflow-x-auto rounded-md border border-line bg-base p-3 font-mono text-[11.5px] text-ink-2">{JSON.stringify(a.details, null, 2)}</pre>
    </div>
  );
}

/**
 * Corporate-action timeline from Robinhood, grouped by process date.
 * OLD / NEW MULTIPLIER are the token's registry multiplier and pending multiplier — shown only when the registry reports them.
 */
export function CorporateActions({ symbol, className, limit }: { symbol?: string; className?: string; limit?: number }) {
  const slice = useLive((s) => s.corporateActions);
  const registry = useLive((s) => s.registry);
  const now = useNowMs(60_000);
  const [open, setOpen] = useState<string | null>(null);
  const [type, setType] = useState<CorporateActionType | "ALL">("ALL");
  const [showDone, setShowDone] = useState(false);

  const bySymbol = useMemo(() => new Map<string, RegistryAsset>((registry.data ?? []).map((a) => [a.tokenSymbol, a])), [registry.data]);
  const all = useMemo(() => {
    const list = (slice.data ?? []).filter((a) => (symbol ? a.tokenSymbol === symbol : true));
    return list.sort((a, b) => (a.processDate ?? "9999").localeCompare(b.processDate ?? "9999"));
  }, [slice.data, symbol]);
  const types = useMemo(() => [...new Set(all.map((a) => a.type))], [all]);
  const rows = all.filter((a) => (type === "ALL" || a.type === type) && (showDone || a.status !== "COMPLETED")).slice(0, limit);
  const groups = useMemo(() => {
    const m = new Map<string, CorporateAction[]>();
    rows.forEach((a) => m.set(a.processDate ?? "UNKNOWN", [...(m.get(a.processDate ?? "UNKNOWN") ?? []), a]));
    return [...m.entries()];
  }, [rows]);
  const health = DATA_MODE === "demo" ? "NOT_CONFIGURED" : sliceHealth(slice, "registry", now || 1);

  return (
    <section className={className} aria-label="Corporate actions">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/80 py-3">
        <h2 className="label !text-ink">{symbol ? `Corporate actions · ${symbol}` : "Corporate actions"}</h2>
        <div className="flex items-center gap-3">
          <HealthTag health={health} />
          <SourceBadge source="ROBINHOOD" at={slice.fetchedAt} note="Robinhood /rhj/corporate-actions" />
        </div>
      </div>
      {DATA_MODE === "demo" ? (
        <p className="py-4 text-[13px] text-ink-3">Demo mode: no live corporate-action feed is connected.</p>
      ) : slice.data === null ? (
        <div className="py-4 text-[13px] text-ink-2">
          {slice.error ? (
            <>
              <span className="font-mono text-conditional">LIVE DATA DEGRADED</span> — Robinhood corporate-actions API: {slice.error}
              <button type="button" onClick={() => liveManager().refresh("corporateActions")} className="ml-3 inline-flex items-center gap-1 font-mono text-[11px] text-cyan">
                <RefreshCw size={11} /> Retry
              </button>
            </>
          ) : (
            <span className="font-mono text-ink-3">Connecting…</span>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 pb-4">
            {(["ALL", ...types] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn("h-7 rounded-xs border px-2.5 font-mono text-[10.5px] tracking-[0.06em] transition-colors", type === t ? "border-ink bg-ink text-on-ink" : "border-line text-ink-3 hover:text-ink")}
              >
                {t === "ALL" ? "ALL" : TYPE_LABEL[t].toUpperCase()}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 font-mono text-[10.5px] text-ink-3">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[var(--color-ink)]" />
              Include completed
            </label>
            <FreshnessTag at={slice.fetchedAt} kind="registry" />
          </div>

          {rows.length === 0 ? (
            <p className="py-4 font-mono text-[12px] text-ink-3">{symbol ? "NONE PENDING" : "No corporate actions match."}</p>
          ) : (
            <div>
              <div className="hidden grid-cols-[150px_minmax(0,1fr)] border-b border-ink/80 pb-2 md:grid">
                <span />
                <div className="grid grid-cols-[80px_150px_minmax(0,1fr)_120px_120px_110px] gap-3 px-3 font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
                  <span>Asset</span>
                  <span>Action</span>
                  <span>Rate</span>
                  <span className="text-right">Old mult.</span>
                  <span className="text-right">New mult.</span>
                  <span className="text-right">Status</span>
                </div>
              </div>
              {groups.map(([date, list]) => (
                <div key={date} className="grid grid-cols-[minmax(0,1fr)] border-b border-line md:grid-cols-[150px_minmax(0,1fr)]">
                  <div className="py-4 md:py-5">
                    <div className="text-[22px] leading-none font-medium tracking-[-0.04em] text-ink">{date === "UNKNOWN" ? "UNKNOWN" : dateLabel(date)}</div>
                    <div className="mt-1.5 font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">{relative(date === "UNKNOWN" ? null : date, now)}</div>
                  </div>
                  <ul className="md:border-l md:border-line">
                    {list.map((a) => {
                      const isOpen = open === a.id;
                      const reg = bySymbol.get(a.tokenSymbol);
                      return (
                        <li key={a.id} className="border-t border-line first:border-t-0 md:first:border-t">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpen(isOpen ? null : a.id)}
                            className="grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-[background-color,padding] duration-300 hover:bg-ink/[0.03] hover:py-3.5 md:grid-cols-[80px_150px_minmax(0,1fr)_120px_120px_110px]"
                          >
                            <span className="text-[15px] font-medium tracking-[-0.02em] text-ink">{a.tokenSymbol}</span>
                            <span className="hidden font-mono text-[11.5px] tracking-[0.06em] text-ink-2 uppercase md:block">{TYPE_LABEL[a.type]}</span>
                            <span className="truncate font-mono text-[12px] text-ink-2">
                              <span className="md:hidden">{TYPE_LABEL[a.type]} · </span>
                              {summary(a)}
                            </span>
                            <span className="tabular hidden text-right font-mono text-[12px] text-ink-2 md:block" title="Current multiplier in the Robinhood registry">
                              {reg ? Number(reg.currentMultiplier).toFixed(6) : "UNKNOWN"}
                            </span>
                            <span className="tabular hidden text-right font-mono text-[12px] text-ink-2 md:block" title="Pending multiplier in the Robinhood registry">
                              {reg?.pendingMultiplier ? Number(reg.pendingMultiplier).toFixed(6) : "—"}
                            </span>
                            <span className={cn("text-right font-mono text-[10px] tracking-[0.08em]", a.status === "IN_PROGRESS" ? "text-conditional" : "text-ink-4")}>{a.status.replace("_", " ")}</span>
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen ? (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                                <Detail a={a} />
                              </motion.div>
                            ) : null}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
