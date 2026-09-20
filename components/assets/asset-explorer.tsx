"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Asset, EligibilityResult, EligibilityStatus } from "@/types";
import { Ago } from "@/components/ui/motion-bits";
import { Kbd, Panel } from "@/components/ui/primitives";
import { StatusBadge, StatusGlyph } from "@/components/ui/status";
import { eligibilityService, policyService } from "@/lib/services";
import { useStore } from "@/hooks/use-store";
import { lifecycle, oracleFlag, redemptionFlag, toneClass, transferFlag } from "@/lib/asset-view";
import { shortAddress } from "@/lib/format";
import { DATA_MODE } from "@/lib/data/config";
import { HealthTag } from "@/components/live/badges";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { STATUS, STATUS_ORDER } from "@/lib/status";
import { cn } from "@/lib/utils";

type SortKey = "asset" | "symbol" | "eligibility" | "score" | "updated";
interface Row {
  asset: Asset;
  result: EligibilityResult;
}

const ORDER: Record<EligibilityStatus, number> = { ELIGIBLE: 0, CONDITIONAL: 1, UNKNOWN: 2, INELIGIBLE: 3 };

const SORTERS: Record<SortKey, (a: Row, b: Row) => number> = {
  asset: (a, b) => a.asset.name.localeCompare(b.asset.name),
  symbol: (a, b) => a.asset.symbol.localeCompare(b.asset.symbol),
  eligibility: (a, b) => ORDER[a.result.status] - ORDER[b.result.status],
  score: (a, b) => (DATA_MODE === "demo" ? (a.result.score ?? -1) - (b.result.score ?? -1) : (a.asset.live?.price?.mid ?? -1) - (b.asset.live?.price?.mid ?? -1)),
  updated: (a, b) => a.asset.updatedAgoSec - b.asset.updatedAgoSec,
};

const selectCls =
  "h-9 rounded-md border border-line bg-base-1 px-2.5 font-mono text-[12px] text-ink-2 outline-none transition-colors hover:border-line-2 focus:border-cyan/60";

export function AssetExplorer({ assets }: { assets: Asset[] }) {
  const router = useRouter();
  const policies = useStore(policyService.state);
  const searchRef = useRef<HTMLInputElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EligibilityStatus | "ALL">("ALL");
  const [chain, setChain] = useState("ALL");
  const [policyId, setPolicyId] = useState("DEFAULT");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "updated", dir: 1 });
  const [cursor, setCursor] = useState(0);

  const policy = policies.find((p) => p.id === policyId) ?? policies[0];
  const registryHealth = useSliceHealthFor("registry");
  const isLiveData = DATA_MODE !== "demo";

  const rows = useMemo<Row[]>(() => assets.map((asset) => ({ asset, result: eligibilityService.evaluate(asset, policy) })), [assets, policy]);

  const counts = useMemo(() => {
    const c = { ALL: rows.length, ELIGIBLE: 0, CONDITIONAL: 0, UNKNOWN: 0, INELIGIBLE: 0 } as Record<EligibilityStatus | "ALL", number>;
    rows.forEach((r) => c[r.result.status]++);
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (status === "ALL" ? true : r.result.status === status))
      .filter((r) => (chain === "ALL" ? true : r.asset.network === chain))
      .filter((r) => !needle || `${r.asset.name} ${r.asset.symbol} ${r.asset.address} ${r.asset.underlying}`.toLowerCase().includes(needle))
      .sort((a, b) => SORTERS[sort.key](a, b) * sort.dir);
  }, [rows, q, status, chain, sort]);

  // "/" focuses search (unless typing elsewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const focusRow = (i: number) => {
    const next = Math.max(0, Math.min(visible.length - 1, i));
    setCursor(next);
    requestAnimationFrame(() => tbodyRef.current?.querySelector<HTMLElement>(`[data-row="${next}"]`)?.focus());
  };

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "score" ? -1 : 1 }));
  const clear = () => {
    setQ("");
    setStatus("ALL");
    setChain("ALL");
  };
  const filtered = !!q || status !== "ALL" || chain !== "ALL";

  return (
    <div>
      {/* filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                focusRow(0);
              }
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            aria-label="Search assets by name, symbol or address"
            placeholder="Search name, symbol, address"
            className="h-9 w-full rounded-md border border-line bg-base-1 pr-9 pl-9 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 hover:border-line-2 focus:border-cyan/60"
          />
          {q ? (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-3 hover:text-ink">
              <X size={14} />
            </button>
          ) : (
            <Kbd className="absolute top-1/2 right-2.5 -translate-y-1/2">/</Kbd>
          )}
        </div>

        <label className="sr-only" htmlFor="f-chain">Chain</label>
        <select id="f-chain" value={chain} onChange={(e) => setChain(e.target.value)} className={selectCls}>
          <option value="ALL">All chains</option>
          <option value="RH_CHAIN">RH Chain</option>
        </select>

        <label className="sr-only" htmlFor="f-policy">Policy</label>
        <select id="f-policy" value={policyId} onChange={(e) => setPolicyId(e.target.value)} className={selectCls}>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              Policy · {p.name}
            </option>
          ))}
        </select>

        <label className="sr-only md:hidden" htmlFor="f-sort">Sort by</label>
        <select id="f-sort" value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [k, d] = e.target.value.split(":"); setSort({ key: k as SortKey, dir: Number(d) as 1 | -1 }); }} className={cn(selectCls, "md:hidden")}>
          <option value="updated:1">Sort · Freshest</option>
          <option value="symbol:1">Sort · Symbol</option>
          <option value="eligibility:1">Sort · Eligibility</option>
          <option value="score:-1">Sort · Score</option>
        </select>
      </div>

      <div role="group" aria-label="Filter by eligibility" className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {(["ALL", ...STATUS_ORDER] as const).map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setStatus(s);
                setCursor(0);
              }}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 font-mono text-[11px] tracking-[0.06em] transition-colors",
                active ? "border-white/25 bg-white/8 text-ink" : "border-line text-ink-2 hover:border-line-2 hover:text-ink",
              )}
            >
              {s !== "ALL" ? <StatusGlyph status={s} size={12} className={STATUS[s].text} /> : null}
              {s}
              <span className="text-ink-3 tabular">{counts[s]}</span>
            </button>
          );
        })}
      </div>

      {/* desktop table */}
      <Panel className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-[13px]">
            <caption className="sr-only">Supported Stock Tokens with collateral eligibility under policy {policy.name}. {isLiveData ? "Live Robinhood registry." : "Demo data."}</caption>
            <thead className="border-b border-line bg-white/2">
              <tr>
                <SortHeader k="asset" sort={sort} onSort={toggleSort}>Asset</SortHeader>
                <SortHeader k="symbol" sort={sort} onSort={toggleSort}>Symbol</SortHeader>
                <SortHeader sort={sort} onSort={toggleSort}>Status</SortHeader>
                <SortHeader k="eligibility" sort={sort} onSort={toggleSort}>Eligibility</SortHeader>
                <SortHeader k="score" className="text-right" sort={sort} onSort={toggleSort}>{isLiveData ? "Price (raw)" : "Score"}</SortHeader>
                <SortHeader sort={sort} onSort={toggleSort}>Oracle</SortHeader>
                <SortHeader sort={sort} onSort={toggleSort}>Transfer</SortHeader>
                <SortHeader sort={sort} onSort={toggleSort}>Redemption</SortHeader>
                <SortHeader k="updated" sort={sort} onSort={toggleSort}>Updated</SortHeader>
              </tr>
            </thead>
            <tbody
              ref={tbodyRef}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  focusRow(cursor + 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  cursor === 0 ? searchRef.current?.focus() : focusRow(cursor - 1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  focusRow(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  focusRow(visible.length - 1);
                }
              }}
            >
              {visible.map(({ asset: a, result: r }, i) => {
                const life = lifecycle(a);
                const or = oracleFlag(a);
                const tr = transferFlag(a);
                const rd = redemptionFlag(a);
                return (
                  <tr
                    key={a.address}
                    data-row={i}
                    tabIndex={i === Math.min(cursor, visible.length - 1) ? 0 : -1}
                    onFocus={() => setCursor(i)}
                    onClick={() => router.push(`/assets/${a.address}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/assets/${a.address}`);
                    }}
                    className="group cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-white/[0.035] focus-visible:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan"
                  >
                    <td className="py-2.5 pr-3 pl-4">
                      <Link href={`/assets/${a.address}`} prefetch={false} tabIndex={-1} className="block">
                        <span className="block text-ink">{a.name}</span>
                        <span className="block font-mono text-[11px] text-ink-3">{shortAddress(a.address)}</span>
                      </Link>
                    </td>
                    <td className="px-3 font-mono text-[12.5px] font-medium text-ink">{a.symbol}</td>
                    <td className="px-3 font-mono text-[11.5px]"><span className={toneClass[life.tone]}>{life.text}</span></td>
                    <td className="px-3"><StatusBadge status={r.status} size="sm" /></td>
                    <td className="px-3 text-right font-mono text-[13px] text-ink tabular">
                      {isLiveData ? (
                        a.live?.price ? `$${a.live.price.mid.toFixed(2)}` : <span className="text-ink-4">UNKNOWN</span>
                      ) : (
                        (r.score ?? <span className="text-ink-4">—</span>)
                      )}
                    </td>
                    <td className={cn("px-3 font-mono text-[11.5px]", toneClass[or.tone])}>{or.text}</td>
                    <td className={cn("px-3 font-mono text-[11.5px]", toneClass[tr.tone])}>{tr.text}</td>
                    <td className={cn("px-3 font-mono text-[11.5px]", toneClass[rd.tone])}>{rd.text}</td>
                    <td className="px-3 pr-4 font-mono text-[11.5px] text-ink-3"><Ago sec={a.updatedAgoSec} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <Empty onClear={clear} filtered={filtered} /> : null}
        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 font-mono text-[11px] text-ink-3">
          <span className="flex items-center gap-3">
            {visible.length} of {rows.length} assets {isLiveData ? <HealthTag health={registryHealth} /> : <span>· demo data</span>}
          </span>
          <span className="hidden items-center gap-3 lg:flex">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
            <span className="flex items-center gap-1"><Kbd>/</Kbd> search</span>
          </span>
        </div>
      </Panel>

      {/* mobile cards */}
      <ul className="space-y-2 md:hidden" aria-label="Assets">
        {visible.map(({ asset: a, result: r }) => {
          const or = oracleFlag(a);
          const tr = transferFlag(a);
          const rd = redemptionFlag(a);
          return (
            <li key={a.address}>
              <Link href={`/assets/${a.address}`} prefetch={false} className="block rounded-lg border border-line bg-surface/80 p-4 active:bg-surface-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[15px] font-medium text-ink">{a.symbol}</div>
                    <div className="text-[13px] text-ink-2">{a.name}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <dl className="mt-3.5 grid grid-cols-4 gap-2 border-t border-line pt-3 font-mono text-[11px]">
                  {[[isLiveData ? "Price" : "Score", isLiveData ? (a.live?.price ? `$${a.live.price.mid.toFixed(2)}` : "UNKNOWN") : (r.score ?? "—"), "text-ink"], ["Oracle", or.text, toneClass[or.tone]], ["Transfer", tr.text, toneClass[tr.tone]], ["Redeem", rd.text, toneClass[rd.tone]]].map(([k, v, c]) => (
                    <div key={String(k)}>
                      <dt className="text-ink-4">{k}</dt>
                      <dd className={cn("mt-0.5", String(c))}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3 flex justify-between font-mono text-[10.5px] text-ink-4">
                  <span>{shortAddress(a.address)}</span>
                  <Ago sec={a.updatedAgoSec} />
                </div>
              </Link>
            </li>
          );
        })}
        {visible.length === 0 ? <Empty onClear={clear} filtered={filtered} /> : null}
      </ul>
    </div>
  );
}

function Empty({ onClear, filtered }: { onClear: () => void; filtered: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[14px] text-ink">No assets match.</p>
      <p className="mt-1 text-[13px] text-ink-3">Try a different search or status.</p>
      {filtered ? (
        <button type="button" onClick={onClear} className="mt-4 h-8 rounded-md border border-line px-3 text-[13px] text-ink-2 hover:border-line-2 hover:text-ink">
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function SortHeader({ k, children, className, sort, onSort }: { k?: SortKey; children: React.ReactNode; className?: string; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void }) {
  return (
    <th scope="col" aria-sort={k && sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : undefined} className={cn("h-10 px-3 text-left font-normal first:pl-4 last:pr-4", className)}>
      {k ? (
        <button type="button" onClick={() => onSort(k)} className={cn("label inline-flex items-center gap-1 transition-colors hover:!text-ink", sort.key === k && "!text-ink")}>
          {children}
          {sort.key === k ? sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ChevronsUpDown size={11} className="opacity-40" />}
        </button>
      ) : (
        <span className="label">{children}</span>
      )}
    </th>
  );
}
