"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ArrowUpRight, X } from "lucide-react";
import { FreshnessTag, ModeBadge } from "@/components/live/badges";
import { ResultTag, StatusBadge } from "@/components/ui/status";
import { useLive } from "@/hooks/use-live";
import { useReducedMotion } from "@/hooks/use-motion";
import { DATA_MODE } from "@/lib/data/config";
import { shortAddress } from "@/lib/format";
import { REASON_TEXT } from "@/lib/status";
import { RH_CHAIN_ID } from "@/lib/wallet/chain";
import { cn } from "@/lib/utils";
import type { CheckId, CheckResult } from "@/types";
import type { SphereItem } from "./use-sphere-data";

/** The five checks the hero narrates, in pipeline order. Values come from the engine result — never from this list. */
const SHOWN: Array<{ id: CheckId; label: string }> = [
  { id: "assetActive", label: "Asset active" },
  { id: "transferEnabled", label: "Transfer enabled" },
  { id: "oracleHealthy", label: "Oracle healthy" },
  { id: "priceFresh", label: "Price fresh" },
  { id: "redemptionEnabled", label: "Redemption available" },
];

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Checks resolve one by one after the packet reaches CHECKS — real results, revealed in sequence. */
function useResolved(key: string, total: number, enabled: boolean) {
  const reduce = useReducedMotion();
  const [st, setSt] = useState({ key: "", n: 0 });
  useEffect(() => {
    if (reduce || !enabled) return;
    const ts = Array.from({ length: total }, (_, i) => setTimeout(() => setSt({ key, n: i + 1 }), 720 + i * 150));
    return () => ts.forEach(clearTimeout);
  }, [key, total, enabled, reduce]);
  if (reduce || !enabled) return total;
  return st.key === key ? st.n : 0;
}

/** Read-only ERC-20 balanceOf for the connected wallet on Robinhood Chain. Renders nothing unless the read succeeds. */
function Holding({ address, symbol, decimals }: { address: string; symbol: string; decimals: number | null }) {
  const { address: me, chainId, isConnected } = useAccount();
  const enabled = isConnected && chainId === RH_CHAIN_ID && decimals !== null && Boolean(me);
  const { data, isError } = useReadContract({
    address: address as `0x${string}`,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: me ? [me] : undefined,
    chainId: RH_CHAIN_ID,
    query: { enabled, staleTime: 30_000 },
  });
  if (!enabled || isError || data === undefined || decimals === null) return null;
  const v = Number(formatUnits(data, decimals));
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
      <dt className="label">Your balance</dt>
      <dd className="tabular font-mono text-[12px] text-ink" title="Read-only balanceOf on Robinhood Chain">
        {v.toLocaleString("en-US", { maximumFractionDigits: 4 })} {symbol}
      </dd>
    </div>
  );
}

function Stat({ k, children, unknown, title }: { k: string; children: React.ReactNode; unknown?: boolean; title?: string }) {
  return (
    <div className="min-w-0" title={title}>
      <dt className="label">{k}</dt>
      <dd className={cn("mt-0.5 truncate font-mono text-[13px] tracking-[-0.01em]", unknown ? "text-ink-4" : "text-ink")}>{children}</dd>
    </div>
  );
}

const ORACLE: Record<CheckResult, string> = { PASS: "HEALTHY", FAIL: "UNHEALTHY", UNKNOWN: "UNKNOWN" };

/**
 * The evidence card attached to a sphere node.
 *  · `selected`  full evaluation: staged check results, decision, reason, wallet balance
 *  · otherwise   quick preview of the hovered node
 */
export function TokenCard({ item, selected, evalKey, docked, onClose }: { item: SphereItem; selected: boolean; evalKey: number; docked?: boolean; onClose?: () => void }) {
  const { asset, result } = item;
  const live = asset.live;
  const slice = useLive((s) => s.symbolPrices[asset.symbol]);
  const price = live?.price ?? null;
  const rows = SHOWN.map((s) => ({ ...s, check: result.checks.find((c) => c.id === s.id) }));
  const resolved = useResolved(`${item.id}:${evalKey}`, rows.length, selected);
  const done = resolved >= rows.length;

  // Bulk feed reports 0 for many symbols; only a per-symbol quote makes 0 a real value.
  const volume = !price || price.dailyVolume === null ? null : price.dailyVolume > 0 || slice?.data ? price.dailyVolume : null;
  const oracle = result.checks.find((c) => c.id === "oracleHealthy")?.result ?? "UNKNOWN";
  const lifecycle = live?.lifecycle ?? "UNKNOWN";
  const reason = result.reasons[0];

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative rounded-lg border border-line-2 bg-surface text-left", docked ? "w-full p-4" : "w-[292px] p-4 shadow-float")}
      role="group"
      aria-label={`${asset.symbol} evidence`}
    >
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${asset.symbol} evidence`}
          className="absolute -top-2.5 -right-2.5 z-10 grid size-6 place-items-center rounded-full border border-line-2 bg-surface text-ink-3 shadow-float transition-colors hover:text-ink focus-visible:text-ink"
        >
          <X size={12} aria-hidden />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-surface-2 font-mono text-[11px] text-ink">
          {live?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={live.logoUrl} alt="" width={36} height={36} className="size-full object-cover" loading="lazy" />
          ) : (
            asset.symbol.slice(0, 2)
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[15px] font-medium tracking-[-0.01em] text-ink">{asset.symbol}</span>
            {selected && !done ? (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line-2 px-2 font-mono text-[10px] tracking-[0.08em] text-ink-3">
                <span aria-hidden className="size-1 animate-pulse rounded-full bg-signal" />
                EVALUATING
              </span>
            ) : (
              <StatusBadge status={result.status} size="sm" />
            )}
          </div>
          <div className="truncate text-[12px] text-ink-3">{live?.tokenName ?? asset.name}</div>
        </div>
      </div>

      {DATA_MODE !== "live" ? <ModeBadge className="mt-3" /> : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat k="Price" unknown={!price} title="Underlying equity quote (mid), not multiplier-adjusted">
          {price ? usd(price.mid) : "UNKNOWN"}
        </Stat>
        <Stat k="24h volume" unknown={volume === null}>
          {volume === null ? "UNKNOWN" : `$${compact(volume)}`}
        </Stat>
        <Stat k="Multiplier" unknown={!live} title={live ? `Exact: ${live.multiplier}` : undefined}>
          {live ? `${Number(live.multiplier).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}×` : "UNKNOWN"}
        </Stat>
        <Stat k="Asset" unknown={lifecycle === "UNKNOWN"}>
          {lifecycle}
        </Stat>
        <Stat k="Oracle" unknown={oracle === "UNKNOWN"}>
          {ORACLE[oracle]}
        </Stat>
        <Stat k="Updated" unknown={!price}>
          {price ? <FreshnessTag at={price.generatedAt} className="!text-[13px]" /> : "UNKNOWN"}
        </Stat>
      </dl>

      {selected ? (
        <div className="mt-4 border-t border-line pt-3">
          <ul className="space-y-1.5" aria-label="Checks">
            {rows.map((r, i) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="text-ink-2">{r.label}</span>
                {i < resolved ? (
                  <motion.span initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
                    <ResultTag result={r.check?.result ?? "UNKNOWN"} />
                  </motion.span>
                ) : (
                  <span aria-hidden className="font-mono text-[11px] text-ink-4">
                    ···
                  </span>
                )}
              </li>
            ))}
          </ul>
          {done && reason ? <p className="mt-3 text-[12px] leading-snug text-ink-3">{REASON_TEXT[reason]}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 font-mono text-[10.5px] text-ink-3">
        <span>Robinhood Chain · {shortAddress(asset.address, 6, 4)}</span>
        {selected ? (
          <Link href={`/app/assets/${asset.symbol}`} className="group inline-flex items-center gap-0.5 text-ink hover:text-cyan">
            Evidence
            <ArrowUpRight size={12} className="transition-transform duration-200 group-hover:translate-x-px group-hover:-translate-y-px" aria-hidden />
          </Link>
        ) : null}
      </div>
      {selected ? (
        <dl className="mt-2.5 empty:hidden">
          <Holding address={asset.address} symbol={asset.symbol} decimals={live?.decimals ?? null} />
        </dl>
      ) : null}
    </motion.div>
  );
}
