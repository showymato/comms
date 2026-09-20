"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FreshnessTag, HealthTag, SourceBadge } from "@/components/live/badges";
import { RollingText } from "@/components/live/rolling-text";
import { useLive, useNowMs } from "@/hooks/use-live";
import { DATA_MODE, FRESHNESS, freshnessOf } from "@/lib/data/config";
import { sliceHealth } from "@/lib/data/live-manager";
import { tokenEquivalent } from "@/lib/live/evidence";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Asset, PriceSnapshot, TradingStatus } from "@/types";

const usd = (n: number, d = 2) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

function Stat({ k, children, sub, wide }: { k: string; children: React.ReactNode; sub?: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2 sm:col-span-1")}>
      <dt className="label">{k}</dt>
      <dd className="mt-1 font-mono text-[15px] text-ink">{children}</dd>
      {sub ? <div className="mt-0.5 font-mono text-[10.5px] text-ink-4">{sub}</div> : null}
    </div>
  );
}

const TRADE: Record<TradingStatus, { text: string; cls: string }> = {
  TRADABLE: { text: "TRADABLE", cls: "text-eligible" },
  UNTRADABLE: { text: "UNTRADABLE", cls: "text-ineligible" },
  UNKNOWN: { text: "UNKNOWN", cls: "text-unknown" },
};

/** Direction + size of the last price move. Only a real change of mid produces one; the first observation produces none. */
function usePriceMove(mid: number | undefined) {
  const [state, setState] = useState<{ last?: number; move: { mid: number; pct: number; dir: 1 | -1 } | null }>({ move: null });
  if (mid !== undefined && mid !== state.last) {
    // derive-state-from-props: React re-renders immediately with the updated state
    setState({
      last: mid,
      move: state.last !== undefined ? { mid, pct: ((mid - state.last) / state.last) * 100, dir: mid > state.last ? 1 : -1 } : state.move,
    });
  }
  return state.move;
}

/** LIVE PRICE + market status + trading capabilities for one asset. Raw quotes are labelled raw. */
export function PricePanel({ asset }: { asset: Asset }) {
  const live = asset.live;
  const slice = useLive((s) => s.symbolPrices[asset.symbol]);
  const bulk = useLive((s) => s.prices);
  const now = useNowMs(1000);
  const price: PriceSnapshot | null = live?.price ?? null;
  const move = usePriceMove(price?.mid);

  if (DATA_MODE === "demo" || !live) {
    return (
      <div className="p-4 text-[13px] text-ink-3">
        <span className="font-mono text-conditional">DEMO DATA</span> — demo assets carry no market price. Switch to live mode for real quotes.
      </div>
    );
  }

  const src = slice ?? bulk;
  const health = sliceHealth(src as never, "price", now || 1);
  const age = price && now ? (now - Date.parse(price.generatedAt)) / 1000 : null;
  const f = freshnessOf(age, FRESHNESS.price);
  const equivalent = price ? tokenEquivalent(price.mid, live.multiplier) : null;
  const multiplied = Number(live.multiplier) !== 1;
  const updating = Boolean(slice?.loading);

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="label">Live price</span>
          <HealthTag health={price ? (health === "LIVE" && f !== "FRESH" ? "LAST_KNOWN" : health) : health === "CONNECTING" ? "CONNECTING" : "OFFLINE"} />
        </div>
        <div className="flex items-center gap-2">
          {updating ? <span className="font-mono text-[10.5px] text-ink-4">Updating…</span> : null}
          <SourceBadge source="ROBINHOOD" at={price?.generatedAt} note="Raw underlying-equity bid/ask from Robinhood /rhj/prices. Not multiplier-adjusted." />
        </div>
      </div>

      {price ? (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <div className="text-[40px] leading-none font-medium tracking-tight text-ink">
              <RollingText value={usd(price.mid)} dir={move?.dir ?? 1} />
            </div>
            <div className="pb-1 font-mono text-[11px] text-ink-3">
              MID · {price.currency} · <span className="text-ink-2">RAW UNDERLYING</span>
            </div>
            <AnimatePresence mode="wait">
              {move ? (
                <motion.span
                  key={move.mid}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn("tabular pb-1 font-mono text-[12px]", move.dir > 0 ? "text-eligible" : "text-ineligible")}
                >
                  {move.dir > 0 ? "▲" : "▼"} {move.pct > 0 ? "+" : ""}
                  {move.pct.toFixed(3)}%
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat k="Bid">{usd(price.bid)}</Stat>
            <Stat k="Ask">{usd(price.ask)}</Stat>
            <Stat k="Spread" sub={`${price.spreadPct.toFixed(3)}%`}>
              {usd(price.spread)}
            </Stat>
            <Stat k="Daily volume" sub="units as reported by API">
              {price.dailyVolume === null ? "UNKNOWN" : compact(price.dailyVolume)}
            </Stat>
            <Stat k="Daily high / low" wide>
              {price.dailyHigh && price.dailyLow ? `${usd(price.dailyHigh)} / ${usd(price.dailyLow)}` : "UNKNOWN"}
            </Stat>
            <Stat k="Token-equivalent" sub={multiplied ? `raw × ${live.multiplier}` : "multiplier 1"}>
              {equivalent === null ? "UNKNOWN" : usd(equivalent)}
            </Stat>
            <Stat k="Quote generated" sub={formatTimestamp(price.generatedAt) + " UTC"}>
              <FreshnessTag at={price.generatedAt} kind="price" />
            </Stat>
            <Stat k="Market status">
              <span className={price.isTradingHalt ? "text-ineligible" : "text-eligible"}>● {price.isTradingHalt ? "HALTED" : "ACTIVE"}</span>
            </Stat>
          </dl>
        </>
      ) : (
        <div className="mt-4 rounded-md border border-unknown/25 bg-unknown/8 px-3 py-3 text-[13px] text-ink-2">
          <span className="font-mono text-unknown">PRICE UNKNOWN</span> — no usable quote from the Robinhood price API.
          {src.error ? <span className="mt-1 block font-mono text-[11px] text-ink-3">{src.error}</span> : null}
        </div>
      )}

      <div className="mt-6 border-t border-line pt-4">
        <div className="label mb-3">Trading capabilities</div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(["market", "extended", "overnight"] as const).map((k) => (
            <div key={k}>
              <dt className="label">{k}</dt>
              <dd className="mt-1 space-y-0.5 font-mono text-[11.5px]">
                {(["whole", "fractional"] as const).map((sub) => {
                  const t = TRADE[live.trading[k][sub]];
                  return (
                    <div key={sub} className="flex items-center justify-between gap-2">
                      <span className="text-ink-4">{sub}</span>
                      <span className={t.cls}>{t.text}</span>
                    </div>
                  );
                })}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
