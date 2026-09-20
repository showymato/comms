"use client";

import { useId } from "react";
import type { PolicyInput } from "@/types";
import { StatusBadge } from "@/components/ui/status";
import { cn } from "@/lib/utils";

type Rules = Pick<PolicyInput, "minLiquidityUsd" | "oracleRequired" | "transferRequired" | "redemptionRequired">;

function YesNo({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-base-1 p-0.5 font-mono text-[11px]">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={cn(
            "h-6 min-w-11 rounded-[5px] px-2.5 tracking-[0.08em] transition-colors disabled:pointer-events-none",
            value === v ? (v ? "bg-cyan/15 text-cyan" : "bg-white/8 text-ink") : "text-ink-3 hover:text-ink-2",
          )}
        >
          {v ? "YES" : "NO"}
        </button>
      ))}
    </div>
  );
}

const Keyword = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("w-[74px] shrink-0 font-mono text-[11px] font-medium tracking-[0.12em] text-cyan", className)}>{children}</span>
);

export function RuleEditor({ value, onChange, readOnly = false, className }: { value: Rules; onChange?: (next: Rules) => void; readOnly?: boolean; className?: string }) {
  const id = useId();
  const set = (patch: Partial<Rules>) => onChange?.({ ...value, ...patch });

  const rows: Array<{ k: "oracleRequired" | "transferRequired" | "redemptionRequired"; label: string; cond: string; op: string }> = [
    { k: "oracleRequired", label: "Oracle required", cond: "Oracle", op: "Healthy and fresh" },
    { k: "transferRequired", label: "Transfer required", cond: "Transfer", op: "Enabled" },
    { k: "redemptionRequired", label: "Redemption required", cond: "Redemption", op: "Enabled" },
  ];

  return (
    <div className={cn("rounded-xl border border-line bg-base-1", className)}>
      <div className="border-b border-line px-5 py-3">
        <span className="label !text-ink-2">Rule</span>
      </div>

      <div className="divide-y divide-line">
        {/* IF liquidity */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
          <Keyword>IF</Keyword>
          <label htmlFor={`${id}-liq`} className="w-24 text-[14px] text-ink">
            Liquidity
          </label>
          <span className="font-mono text-[13px] text-ink-2">≥</span>
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div className="flex h-9 w-40 items-center rounded-md border border-line-2 bg-surface px-3 focus-within:border-cyan/60">
              <span className="font-mono text-[13px] text-ink-3">$</span>
              <input
                id={`${id}-liq`}
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                disabled={readOnly}
                value={Number.isFinite(value.minLiquidityUsd) ? value.minLiquidityUsd : 0}
                onChange={(e) => set({ minLiquidityUsd: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                className="h-full w-full bg-transparent pl-1.5 font-mono text-[13px] text-ink outline-none disabled:opacity-70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <input
              type="range"
              aria-label="Minimum liquidity slider"
              min={0}
              max={5_000_000}
              step={10_000}
              disabled={readOnly}
              value={Math.min(value.minLiquidityUsd, 5_000_000)}
              onChange={(e) => set({ minLiquidityUsd: Number(e.target.value) })}
              className="h-1 min-w-32 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan disabled:opacity-60"
            />
          </div>
        </div>

        {rows.map((r) => (
          <div key={r.k} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition-opacity", !value[r.k] && "opacity-60")}>
            <Keyword>AND</Keyword>
            <span className="w-24 text-[14px] text-ink">{r.cond}</span>
            <span className="font-mono text-[13px] text-ink-2">=</span>
            <span className="min-w-28 flex-1 text-[14px] text-ink-2">{value[r.k] ? r.op : <span className="text-ink-3 line-through decoration-ink-4">{r.op}</span>}</span>
            <div className="flex items-center gap-2">
              <span className="label hidden sm:inline">Required</span>
              <YesNo value={value[r.k]} onChange={(v) => set({ [r.k]: v })} label={r.label} disabled={readOnly} />
            </div>
          </div>
        ))}

        <div className="flex items-center gap-4 bg-eligible/[0.04] px-5 py-4">
          <Keyword className="text-eligible">THEN</Keyword>
          <StatusBadge status="ELIGIBLE" size="lg" />
        </div>

        <div className="px-5 py-4">
          <div className="mb-3 flex items-center gap-4">
            <Keyword className="text-ink-2">OTHERWISE</Keyword>
            <span className="text-[12px] text-ink-3">Set by the engine, not by the policy</span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["CONDITIONAL", "Liquidity is below the minimum"],
                ["INELIGIBLE", "A required check fails"],
                ["UNKNOWN", "Required evidence is missing"],
              ] as const
            ).map(([s, why]) => (
              <li key={s} className="flex flex-col items-start gap-2 rounded-md border border-line px-3 py-2.5">
                <StatusBadge status={s} size="sm" />
                <span className="text-[12px] leading-snug text-ink-3">{why}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
