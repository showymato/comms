"use client";

import { motion } from "motion/react";
import type { CheckOutcome } from "@/types";
import { CodeBlock } from "@/components/ui/code-block";
import { ResultTag } from "@/components/ui/status";
import { SourceBadge } from "@/components/live/badges";
import { ExternalLink } from "lucide-react";
import { useNowMs } from "@/hooks/use-live";
import { explorerAddressUrl, explorerBlockUrl } from "@/lib/wallet/chain";
import { formatAgo, formatTimestamp } from "@/lib/format";
import { isDemoSource } from "@/lib/live/health";
import { CHECK_STATUS, STATUS } from "@/lib/status";
import { json } from "@/data/api-docs";
import { cn } from "@/lib/utils";

const Field = ({ k, children, className }: { k: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("grid grid-cols-[132px_1fr] items-baseline gap-3 border-b border-line py-3 last:border-0", className)}>
    <dt className="label">{k}</dt>
    <dd className="font-mono text-[13px] text-ink">{children}</dd>
  </div>
);

/** Auditable evidence record for one check. Used in the drawer and on the landing page. */
export function EvidencePanel({ check, compactJson = false }: { check: CheckOutcome; compactJson?: boolean }) {
  const { evidence: e } = check;
  const now = useNowMs(1000);
  const status = CHECK_STATUS[check.result];
  const record = {
    check: check.field,
    result: e.value,
    source: e.source,
    network: e.network ?? null,
    contract: e.contract ?? null,
    blockNumber: e.blockNumber > 0 ? e.blockNumber : null,
    timestamp: e.timestamp,
    confidence: e.confidence,
    note: e.note ?? null,
  };

  return (
    <div className="px-5 py-4">
      <div className={cn("mb-4 flex items-center justify-between rounded-lg border px-3.5 py-3", STATUS[status].bg, STATUS[status].border)}>
        <div>
          <div className="label mb-1">{check.label}</div>
          <ResultTag result={check.result} text={check.result === "PASS" ? check.passLabel : check.result === "FAIL" ? check.failLabel : undefined} className="text-[13px]" />
        </div>
        <span className="font-mono text-[11px] text-ink-3">{check.required ? "REQUIRED BY POLICY" : "NOT REQUIRED BY POLICY"}</span>
      </div>

      <dl>
        <Field k="Check">{check.field}</Field>
        <Field k="Result">
          <span className={cn(e.value === null && "text-unknown")}>{check.rawValue}</span>
        </Field>
        <Field k="Source">
          <span className="flex flex-wrap items-center gap-2">
            {e.source === "NONE" ? "UNKNOWN — no source" : e.source}
            <SourceBadge source={e.source} at={e.timestamp} note={e.note} />
            {isDemoSource(e.source) ? <span className="rounded-xs border border-conditional/30 px-1 font-mono text-[9.5px] text-conditional">DEMO</span> : null}
          </span>
        </Field>
        {e.source === "ONCHAIN" ? <Field k="Network">{e.network ?? "—"}</Field> : null}
        {e.contract ? (
          <Field k="Contract">
            <span className="break-all">{e.contract}</span>
          </Field>
        ) : null}
        <Field k="Block number">{e.blockNumber > 0 ? e.blockNumber.toLocaleString("en-US") : "— (not tied to a block)"}</Field>
        <Field k="Timestamp">{e.value === null ? "—" : formatTimestamp(e.timestamp)}</Field>
        <Field k="Freshness">
          {e.value === null || !now ? "—" : `${formatAgo(Math.max(0, (now - Date.parse(e.timestamp)) / 1000))} · observed ${formatTimestamp(e.timestamp)} UTC`}
        </Field>
        <Field k="Confidence">
          {e.confidence === null ? (
            <span className="text-ink-3">NOT REPORTED</span>
          ) : (
            <span className="flex items-center gap-3">
              <span className="tabular">{e.confidence.toFixed(1)}</span>
              <span aria-hidden className="h-1 w-24 overflow-hidden rounded-full bg-ink/8">
                <motion.span
                  className={cn("block h-full rounded-full", STATUS[status].dot)}
                  initial={{ width: 0 }}
                  animate={{ width: `${e.confidence * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            </span>
          )}
        </Field>
        <Field k="Explorer">
          {e.contract || e.blockNumber > 0 ? (
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              {e.contract ? (
                <a href={explorerAddressUrl(e.contract)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan underline decoration-cyan/30 underline-offset-4 hover:decoration-cyan">
                  View on Blockscout <ExternalLink size={11} aria-hidden />
                </a>
              ) : null}
              {e.blockNumber > 0 ? (
                <a href={explorerBlockUrl(e.blockNumber)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan underline decoration-cyan/30 underline-offset-4 hover:decoration-cyan">
                  Block {e.blockNumber.toLocaleString("en-US")} <ExternalLink size={11} aria-hidden />
                </a>
              ) : null}
            </span>
          ) : (
            <span className="text-ink-3">UNKNOWN — no onchain reference</span>
          )}
        </Field>
      </dl>

      {e.value === null ? (
        <p className="mt-4 rounded-md border border-unknown/25 bg-unknown/8 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
          {e.note ? <span className="mb-1.5 block font-mono text-[11.5px] text-ink-3">REASON: {e.note}</span> : null}
          No verified evidence is available. COMMS does not guess: a required check without evidence resolves the decision to <span className="font-mono text-unknown">UNKNOWN</span> with reason{" "}
          <span className="font-mono text-unknown">INSUFFICIENT_EVIDENCE</span>.
        </p>
      ) : null}

      <div className="mt-5">
        <div className="label mb-2">Evidence record</div>
        <CodeBlock code={json(record)} lang="json" title="eligibility_check.json" className={compactJson ? "text-[12px]" : undefined} />
      </div>
    </div>
  );
}
