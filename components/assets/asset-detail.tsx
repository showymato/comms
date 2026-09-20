"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Asset, CheckOutcome, EligibilityEvent } from "@/types";
import { CheckRing } from "@/components/eligibility/check-ring";
import { AnimatedCheck, Ago } from "@/components/ui/motion-bits";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/code-block";
import { Drawer } from "@/components/ui/overlay";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { ResultTag, StatusGlyph } from "@/components/ui/status";
import { ContractInspection } from "@/components/live/contract-inspection";
import { CorporateActions } from "@/components/live/corporate-actions";
import { EventTimeline } from "@/components/live/event-timeline";
import { FreshnessTag, HealthTag, SourceBadge } from "@/components/live/badges";
import { PricePanel } from "@/components/live/price-panel";
import { DATA_MODE } from "@/lib/data/config";
import { eligibilityService, policyService } from "@/lib/services";
import { useStore } from "@/hooks/use-store";
import { formatTimestamp, formatUsd } from "@/lib/format";
import { CHECK_STATUS, REASON_TEXT, STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { EvidencePanel } from "./evidence-panel";
import { HistoryTimeline } from "./history-timeline";

export function AssetDetail({ asset, history }: { asset: Asset; history: EligibilityEvent[] }) {
  const policies = useStore(policyService.state);
  const [policyId, setPolicyId] = useState("DEFAULT");
  const [selected, setSelected] = useState<string | null>(null);

  const policy = policies.find((p) => p.id === policyId) ?? policies[0];
  const result = useMemo(() => eligibilityService.evaluate(asset, policy), [asset, policy]);
  const m = STATUS[result.status];

  const idx = result.checks.findIndex((c) => c.id === selected);
  const check: CheckOutcome | undefined = idx >= 0 ? result.checks[idx] : undefined;

  return (
    <div className="mx-auto max-w-[1280px]">
      <Link href="/assets" className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-3 transition-colors hover:text-ink">
        <ChevronLeft size={14} /> Assets
      </Link>

      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label mb-2">Stock Token</div>
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-[28px] leading-none font-semibold tracking-[-0.03em] text-ink lg:text-[34px]">
            <span>{asset.symbol}</span>
            <span className="text-ink-3">{asset.name.toUpperCase()}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[12px] text-ink-2">
            <span className="flex items-center gap-2">
              <span title={asset.address}>{asset.address.slice(0, 6)}…{asset.address.slice(-4)}</span>
              <CopyButton text={asset.address} label="Copy address" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-ink-4">NETWORK</span> RH CHAIN
            </span>
            <span className="text-ink-4">
              Updated <Ago sec={asset.updatedAgoSec} />
            </span>
            {asset.live ? (
              <span className="flex items-center gap-1.5">
                <span className="text-ink-4">STATUS</span>
                <span className={asset.live.lifecycle === "ACTIVE" ? "text-eligible" : asset.live.lifecycle === "INACTIVE" ? "text-ineligible" : "text-unknown"}>● {asset.live.lifecycle}</span>
                <SourceBadge source="ROBINHOOD" at={asset.live.registryFetchedAt} note={`Robinhood /assets status = ${asset.live.rawStatus || "absent"}`} />
              </span>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="d-policy" className="label mb-1.5 block">Policy</label>
          <select
            id="d-policy"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            className="h-9 rounded-md border border-line bg-base-1 px-2.5 font-mono text-[12px] text-ink outline-none hover:border-line-2 focus:border-cyan/60"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* decision */}
          <motion.section
            key={result.status + policyId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            aria-label="Collateral decision"
            className={cn("relative overflow-hidden rounded-xl border bg-base-1", m.border)}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 0% 0%, ${m.hex}1f, transparent 55%)` }} />
            <div className="relative grid gap-6 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
              <CheckRing
                checks={result.checks}
                size={128}
                label={
                  <span>
                    <span className="block text-[28px] leading-none font-semibold tracking-[-0.04em] text-ink tabular">{result.passed}</span>
                    <span className="mt-1 block font-mono text-[9.5px] tracking-[0.1em] text-ink-3">OF {result.checks.length}</span>
                  </span>
                }
              />
              <div>
                <div className="label mb-2.5">Collateral status</div>
                <div className={cn("flex items-center gap-3", m.text)} role="status">
                  {result.status === "ELIGIBLE" ? <AnimatedCheck size={30} /> : <StatusGlyph status={result.status} size={28} />}
                  <span className="text-[34px] leading-none font-semibold tracking-[-0.035em] sm:text-[42px]">{m.label}</span>
                </div>
                <p className="mt-3 font-mono text-[12px] text-ink-2">
                  {result.passed} checks passed. {result.failed} failed. {result.unknown} unknown.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.reasons.map((r) => (
                    <span key={r} className={cn("rounded-xs border px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.06em]", m.border, m.bg, m.text)}>
                      {r}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[13px] text-ink-3">{REASON_TEXT[result.reasons[0]]}</p>
              </div>
              <div className="border-t border-line pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
                <div className="label mb-1.5">Eligibility score</div>
                {DATA_MODE === "demo" ? (
                  <div className="text-[36px] leading-none font-semibold tracking-[-0.04em] text-ink-2 tabular">{result.score ?? "—"}</div>
                ) : (
                  <div className="font-mono text-[13px] leading-none text-ink-3">NOT AVAILABLE</div>
                )}
                <p className="mt-2 max-w-[150px] text-[11.5px] leading-snug text-ink-4">
                  {DATA_MODE === "demo" ? "Supplementary. The status above is the decision." : "No verified liquidity source, so a score cannot be justified. The status is the decision."}
                </p>
                {DATA_MODE !== "demo" ? (
                  <p className="mt-3 flex items-center gap-1.5 font-mono text-[10.5px] text-ink-4">
                    Last evaluated <FreshnessTag at={result.evaluatedAt} kind="registry" />
                  </p>
                ) : null}
              </div>
            </div>
          </motion.section>

          {asset.live ? (
            <Panel aria-label="Live price">
              <PricePanel asset={asset} />
            </Panel>
          ) : null}

          {/* diagnostic timeline */}
          <Panel>
            <PanelHeader title="Check breakdown" meta={<span className="font-mono">Select a check for its evidence</span>} />
            <ol className="relative py-2" aria-label="Checks">
              {result.checks.map((c, i) => {
                const st = STATUS[CHECK_STATUS[c.result]];
                return (
                  <motion.li key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.35 }} className="relative">
                    {i < result.checks.length - 1 ? <span aria-hidden className="absolute top-[30px] bottom-[-14px] left-[27px] w-px bg-line-2" /> : null}
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className="group relative flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.035]"
                      aria-label={`${c.label}: ${c.result}. Open evidence.`}
                    >
                      <span className={cn("relative z-10 grid size-[22px] shrink-0 place-items-center rounded-full border bg-base-1", st.border, st.text)}>
                        <StatusGlyph status={CHECK_STATUS[c.result]} size={11} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] text-ink">{c.label}</span>
                        <span className="block font-mono text-[11px] text-ink-4">{c.field}</span>
                      </span>
                      {!c.required ? <span className="hidden rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px] text-ink-3 sm:block">NOT REQUIRED</span> : null}
                      <ResultTag result={c.result} text={c.result === "PASS" ? c.passLabel : c.result === "FAIL" ? c.failLabel : undefined} />
                      <ChevronRight size={14} className="text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-2" aria-hidden />
                    </button>
                  </motion.li>
                );
              })}
            </ol>
          </Panel>

          {/* policy rules */}
          <Panel>
            <PanelHeader title={`Policy requirements · ${policy.name}`} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left">
                    {["Requirement", "Policy", "Asset", ""].map((h, i) => (
                      <th key={i} scope="col" className="label px-4 py-2.5 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rules.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink">{r.label}</td>
                      <td className="px-4 font-mono text-[12px] text-ink-2">{r.requirement}</td>
                      <td className="px-4 font-mono text-[12px] text-ink-2">{r.actual}</td>
                      <td className="px-4 text-right"><ResultTag result={r.result} text={r.result === "PASS" ? "MET" : r.result === "FAIL" ? "NOT MET" : "NO DATA"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader title="Asset" />
            <dl className="divide-y divide-line text-[13px]">
              {[
                ["Underlying", asset.underlying],
                ["Network", "RH Chain"],
                ["Liquidity", asset.state.liquidityUsd.value === null ? "UNKNOWN" : formatUsd(asset.state.liquidityUsd.value)],
                ["Liquidity source", asset.state.liquidityUsd.value === null ? "—" : asset.state.liquidityUsd.source],
                ...(asset.live
                  ? [
                      ["Multiplier", asset.live.multiplier],
                      ["Pending multiplier", asset.live.pendingMultiplier ?? "NONE"],
                      ["ISIN", asset.live.isin ?? "UNKNOWN"],
                      ["Registry fetched", formatTimestamp(asset.live.registryFetchedAt)],
                    ]
                  : [["Last state update", formatTimestamp(asset.state.transferEnabled.timestamp)]]),
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right font-mono text-[12px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {asset.live ? (
            <>
              <ContractInspection asset={asset} />
              <CorporateActions symbol={asset.symbol} />
              <Panel id="history" className="scroll-mt-20">
                <PanelHeader title="Observed events" meta={<HealthTag health="ON_DEMAND" />} />
                <EventTimeline symbol={asset.symbol} limit={12} />
              </Panel>
            </>
          ) : (
            <Panel id="history" className="scroll-mt-20">
              <PanelHeader title="Eligibility history" meta={<span className="font-mono">{history.length} changes · demo</span>} />
              <div className="p-4">
                <HistoryTimeline events={history} />
              </div>
            </Panel>
          )}

          <Button href={`/events?asset=${asset.symbol}`} variant="secondary" className="w-full">
            View events for {asset.symbol} <ChevronsRight size={14} />
          </Button>
        </div>
      </div>

      <Drawer
        open={!!check}
        onClose={() => setSelected(null)}
        eyebrow={`${asset.symbol} · Evidence`}
        title={check?.field ?? ""}
        footer={
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" disabled={idx <= 0} onClick={() => setSelected(result.checks[idx - 1].id)}>
              <ChevronLeft size={14} /> Previous
            </Button>
            <span className="font-mono text-[11px] text-ink-3">{idx + 1} / {result.checks.length}</span>
            <Button size="sm" variant="ghost" disabled={idx < 0 || idx >= result.checks.length - 1} onClick={() => setSelected(result.checks[idx + 1].id)}>
              Next <ChevronRight size={14} />
            </Button>
          </div>
        }
      >
        {check ? <EvidencePanel check={check} /> : null}
      </Drawer>
    </div>
  );
}
