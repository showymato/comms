"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HealthTag, SourceBadge } from "@/components/live/badges";
import { useNowMs } from "@/hooks/use-live";
import { useStore } from "@/hooks/use-store";
import { eventsFeed } from "@/lib/data/events-feed";
import { formatAgo, formatClock, formatTimestamp } from "@/lib/format";
import type { FeedEvent, FeedType } from "@/lib/live/event-feed";
import { explorerBlockUrl, explorerTxUrl } from "@/lib/wallet/chain";
import { cn } from "@/lib/utils";

const FILTERS: Array<[FeedType | "ALL", string]> = [
  ["ALL", "All"],
  ["CONTRACT_EVENT", "Contract events"],
  ["TRANSFER_RESTRICTION", "Transfer restriction"],
  ["CORPORATE_ACTION", "Corporate actions"],
];

const TONE: Record<string, string> = {
  CORPORATE_ACTION: "border-iris/40 text-iris",
  TRANSFER_RESTRICTION: "border-conditional/50 text-conditional",
  CONTRACT_EVENT: "border-line-2 text-ink-2",
};

/**
 * The real event feed. Every row is an onchain log or a Robinhood corporate action — never simulated.
 * Onchain rows carry block, transaction hash and block time; new rows animate in as they arrive.
 */
export function ChainEventStream({ symbol }: { symbol?: string }) {
  const feed = eventsFeed();
  const s = useStore(feed.store);
  const now = useNowMs(1000);
  const [filter, setFilter] = useState<FeedType | "ALL">("ALL");

  useEffect(() => feed.attach(), [feed]);

  // scheduled (future-dated) corporate actions belong to the timeline below, not to "what happened"
  const day = Math.floor(now / 86_400_000);
  const rows = useMemo(() => {
    const t = day * 86_400_000 + 86_400_000;
    return s.events.filter((e) => (symbol ? e.symbol === symbol : true)).filter((e) => (filter === "ALL" ? true : e.type === filter)).filter((e) => !(t > 86_400_000 && e.type === "CORPORATE_ACTION" && e.timestamp && Date.parse(e.timestamp) >= t));
  }, [s.events, filter, symbol, day]);

  const health = s.error && s.events.length === 0 ? "OFFLINE" : s.error ? "DEGRADED" : s.fetchedAt === null ? "CONNECTING" : now - s.fetchedAt < 60_000 ? "LIVE" : "LAST_KNOWN";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 pb-3">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
            className={cn("h-8 rounded-md border px-3 font-mono text-[11px] tracking-[0.06em] uppercase transition-colors", filter === k ? "border-ink bg-ink text-on-ink" : "border-line text-ink-2 hover:border-line-2 hover:text-ink")}
          >
            {label}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 font-mono text-[11px] tracking-[0.06em] text-ink-2 uppercase">
          <input type="checkbox" checked={s.transfers} onChange={(e) => feed.setTransfers(e.target.checked)} className="size-3.5 accent-[var(--color-ink)]" />
          Include Transfer logs
        </label>
        <button type="button" onClick={() => feed.refresh()} aria-label="Refresh events" className="grid size-8 place-items-center rounded-md border border-line text-ink-2 hover:border-line-2 hover:text-ink">
          <RefreshCw size={13} className={s.loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-line py-2.5 font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
        <HealthTag health={health} />
        <span>Source: Robinhood Chain RPC + Robinhood API</span>
        {s.range && s.range.toBlock > 0 ? (
          <span>
            Blocks {s.range.fromBlock.toLocaleString("en-US")}–{s.range.toBlock.toLocaleString("en-US")} · {s.range.scanned.toLocaleString("en-US")} matching logs
          </span>
        ) : null}
        {s.fetchedAt && now ? <span>Updated {formatAgo((now - s.fetchedAt) / 1000)}</span> : null}
        <span className="normal-case tracking-normal">Polling every 15 s · no WebSocket provider configured</span>
      </div>

      {s.error ? (
        <p role="alert" className="mt-3 font-mono text-[12px] text-conditional">
          {s.events.length ? "Latest refresh failed — showing last known events. " : "Unable to retrieve events. "}
          {s.error}
        </p>
      ) : null}
      {s.degraded.map((d) => (
        <p key={d.source} className="mt-2 font-mono text-[11.5px] text-conditional">
          {d.source} unavailable: {d.error}
        </p>
      ))}

      {rows.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-[15px] text-ink">{s.fetchedAt === null ? "Reading the chain…" : "No matching events in the scanned range."}</p>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-3">
            Lifecycle events (pause, unpause, upgrade, ownership) are rare. Enable <span className="font-mono text-ink">Include Transfer logs</span> to watch live contract activity.
          </p>
        </div>
      ) : (
        <ol aria-label="Event stream">
          <AnimatePresence initial={false}>
            {rows.map((e) => (
              <Row key={e.id} e={e} fresh={s.fresh.includes(e.id)} />
            ))}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

function Row({ e, fresh }: { e: FeedEvent; fresh: boolean }) {
  return (
    <motion.li
      layout="position"
      initial={fresh ? { opacity: 0, y: -14, backgroundColor: "rgba(0,200,255,0.14)" } : false}
      animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,200,255,0)" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-line px-1 py-3.5 md:grid-cols-[92px_minmax(0,1.1fr)_minmax(0,2fr)_minmax(0,1.3fr)]"
    >
      <span className="tabular font-mono text-[11.5px] text-ink-3" title={e.timestamp ?? undefined}>
        {e.timestamp ? (e.source === "ONCHAIN" ? `${formatClock(e.timestamp)} UTC` : formatTimestamp(e.timestamp).split(",")[0]) : "TIME UNKNOWN"}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex h-5 items-center rounded-xs border px-1.5 font-mono text-[9.5px] tracking-[0.08em]", TONE[e.type] ?? "border-line text-ink-2")}>{e.type}</span>
        {e.symbol ? (
          <Link href={`/app/assets/${e.symbol}`} className="font-mono text-[12.5px] font-medium text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink">
            {e.symbol}
          </Link>
        ) : (
          <span className="font-mono text-[12px] text-ink-3">UNREGISTERED</span>
        )}
      </span>
      <span className="min-w-0 text-[13px] text-ink-2 [overflow-wrap:anywhere]">
        <span className="font-mono text-[12px] text-ink">{e.name}</span> — {e.detail}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-3 md:justify-end">
        <SourceBadge source={e.source} at={e.timestamp} />
        {e.block !== null ? (
          <a href={explorerBlockUrl(e.block)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
            #{e.block.toLocaleString("en-US")} <ExternalLink size={10} aria-hidden />
          </a>
        ) : null}
        {e.txHash ? (
          <a href={explorerTxUrl(e.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink" title={e.txHash}>
            tx {e.txHash.slice(0, 8)}… <ExternalLink size={10} aria-hidden />
          </a>
        ) : null}
      </span>
    </motion.li>
  );
}
