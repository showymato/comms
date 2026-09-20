"use client";

import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { FreshnessTag, HealthTag, SourceBadge } from "@/components/live/badges";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { useLive, useNowMs } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { liveManager, sliceHealth } from "@/lib/data/live-manager";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CorporateAction, CorporateActionType } from "@/types";

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
    <div className="border-t border-line bg-base-1/60 px-4 py-4">
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

/** Live corporate actions from Robinhood. Optionally scoped to one token symbol. */
export function CorporateActions({ symbol, className, limit }: { symbol?: string; className?: string; limit?: number }) {
  const slice = useLive((s) => s.corporateActions);
  const now = useNowMs(1000);
  const [open, setOpen] = useState<string | null>(null);
  const [type, setType] = useState<CorporateActionType | "ALL">("ALL");
  const [showDone, setShowDone] = useState(false);

  const all = useMemo(() => {
    const list = (slice.data ?? []).filter((a) => (symbol ? a.tokenSymbol === symbol : true));
    return list.sort((a, b) => (a.processDate ?? "").localeCompare(b.processDate ?? ""));
  }, [slice.data, symbol]);
  const types = useMemo(() => [...new Set(all.map((a) => a.type))], [all]);
  const rows = all.filter((a) => (type === "ALL" || a.type === type) && (showDone || a.status !== "COMPLETED")).slice(0, limit);
  const health = DATA_MODE === "demo" ? "NOT_CONFIGURED" : sliceHealth(slice, "registry", now || 1);

  return (
    <Panel className={className}>
      <PanelHeader
        title={symbol ? `Corporate actions · ${symbol}` : "Corporate actions"}
        meta={
          <>
            <HealthTag health={health} />
            <SourceBadge source="ROBINHOOD" at={slice.fetchedAt} note="Robinhood /rhj/corporate-actions" />
          </>
        }
      />
      {DATA_MODE === "demo" ? (
        <p className="p-4 text-[13px] text-ink-3">Demo mode: no live corporate-action feed is connected.</p>
      ) : slice.data === null ? (
        <div className="p-4 text-[13px] text-ink-2">
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
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            {(["ALL", ...types] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={cn("h-6 rounded-xs border px-2 font-mono text-[10.5px] transition-colors", type === t ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-ink-3 hover:text-ink")}
              >
                {t === "ALL" ? "ALL" : TYPE_LABEL[t].toUpperCase()}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 font-mono text-[10.5px] text-ink-3">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-cyan" />
              Include completed
            </label>
            <FreshnessTag at={slice.fetchedAt} kind="registry" />
          </div>
          {rows.length === 0 ? (
            <p className="p-4 font-mono text-[12px] text-ink-3">{symbol ? "NONE PENDING" : "No corporate actions match."}</p>
          ) : (
            <ul>
              {rows.map((a) => {
                const isOpen = open === a.id;
                return (
                  <li key={a.id} className="border-b border-line last:border-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : a.id)}
                      className="grid w-full grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/3 sm:grid-cols-[64px_150px_minmax(0,1fr)_130px_auto]"
                    >
                      <span className="font-mono text-[13px] font-medium text-ink">{a.tokenSymbol}</span>
                      <span className="hidden font-mono text-[11.5px] tracking-[0.06em] text-ink-2 uppercase sm:block">{TYPE_LABEL[a.type]}</span>
                      <span className="truncate font-mono text-[12px] text-ink-2">{summary(a)}</span>
                      <span className="hidden font-mono text-[11px] text-ink-3 sm:block">{dateLabel(a.processDate)}</span>
                      <span className={cn("font-mono text-[10px] tracking-[0.08em]", a.status === "IN_PROGRESS" ? "text-conditional" : "text-ink-4")}>{a.status.replace("_", " ")}</span>
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
          )}
        </>
      )}
    </Panel>
  );
}
