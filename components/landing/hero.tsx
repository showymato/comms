"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipLines } from "@/components/ui/motion-bits";
import { StatusBadge } from "@/components/ui/status";
import { Metric } from "@/components/live/metric";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLive } from "@/hooks/use-live";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StateField, type FieldHover, type FieldKind } from "./state-field";

const COLUMNS: Array<{ kind: FieldKind; label: string; at: number }> = [
  { kind: "asset", label: "Assets", at: 0 },
  { kind: "check", label: "Checks", at: 0.34 },
  { kind: "policy", label: "Policy", at: 0.66 },
  { kind: "decision", label: "Decision", at: 1 },
];

const MAX_NODES = 12;

/** Real, evenly spaced sample of the registry — never placeholder symbols. */
function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, i) => items[Math.floor((i * items.length) / n)]);
}

export function Hero() {
  const ev = useEvaluated();
  const chain = useLive((s) => s.chain);
  const chainHealth = useSliceHealthFor("chain");
  const [hover, setHover] = useState<FieldHover | null>(null);
  const [focus, setFocus] = useState<FieldKind | null>(null);

  const picked = useMemo(() => {
    const idx = ev.assets.map((_, i) => i).sort((a, b) => ev.assets[a].symbol.localeCompare(ev.assets[b].symbol));
    return sample(idx, MAX_NODES);
  }, [ev.assets]);
  const statuses = useMemo(() => picked.map((i) => ev.results[i].status), [picked, ev.results]);
  const rules = ev.results[0]?.rules ?? [];
  const checks = ev.results[0]?.checks ?? [];

  const loaded = ev.assets.length > 0;
  const state = loaded ? "ok" : ev.error ? "unknown" : "loading";
  const chainState = chain.data ? "ok" : chain.error ? "unknown" : "loading";

  const readout = (() => {
    const kind = hover?.kind ?? focus;
    if (!loaded) return { eyebrow: "Waiting for the registry", title: "Reading live state…", body: ev.error ?? "The field draws itself from real assets as soon as the registry responds." };
    if (!kind) return { eyebrow: "Collateral state field", title: "Hover a node.", body: "Every asset, check and decision here is real. Packets follow each asset to the decision it actually received." };
    if (kind === "asset") {
      const i = hover ? picked[hover.index] : null;
      const a = i === null || i === undefined ? null : ev.assets[i];
      if (!a || i === null || i === undefined) return { eyebrow: "Assets", title: `${ev.assets.length} Stock Tokens`, body: "Nodes are a sample of the live registry. Each ends at the decision it currently receives.", status: undefined };
      return { eyebrow: `Asset · ${a.symbol}`, title: a.name, body: `${shortAddress(a.address)} on Robinhood Chain · ${a.live?.lifecycle ?? "UNKNOWN"}`, status: ev.results[i].status };
    }
    if (kind === "check") {
      const c = hover ? ev.coverage[hover.index] : null;
      if (!c) return { eyebrow: "Checks", title: `${checks.length} checks`, body: "Each check reads one piece of evidence. No evidence, no pass.", status: undefined };
      return { eyebrow: "Check", title: c.label, body: `${c.pass} pass · ${c.fail} fail · ${c.unknown} unknown across ${ev.assets.length} assets${c.sources.length ? ` · source ${c.sources.join(", ")}` : " · no verifiable source"}` };
    }
    if (kind === "policy") {
      const r = hover ? rules[hover.index] : null;
      if (!r) return { eyebrow: "Policy", title: ev.policy.name, body: ev.policy.description };
      return { eyebrow: `Policy · ${ev.policy.name}`, title: r.label, body: `Requires ${r.requirement}` };
    }
    const order = ["ELIGIBLE", "CONDITIONAL", "INELIGIBLE", "UNKNOWN"] as const;
    const st = hover ? order[hover.index] : null;
    if (!st) return { eyebrow: "Decision", title: "Four outcomes", body: "ELIGIBLE, CONDITIONAL, INELIGIBLE or UNKNOWN. Nothing else." };
    return { eyebrow: "Decision", title: `${ev.counts[st]} of ${ev.assets.length} assets`, body: `currently ${st}`, status: st };
  })();

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div className="glow-spectral absolute inset-0" />
      </div>

      <div className="mx-auto max-w-[1400px] px-5 pt-28 lg:px-10 lg:pt-36">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="label flex items-center gap-3">
          <span className="text-ink">COMMS</span>
          <span aria-hidden className="h-px w-8 bg-line-2" />
          <span>Collateral intelligence</span>
        </motion.div>

        <h1 id="hero-title" className="display mt-8 text-[clamp(2.35rem,9.2vw,3.6rem)] text-ink uppercase sm:text-[clamp(2.6rem,7.6vw,7.4rem)] lg:text-[clamp(3rem,6.7vw,7.4rem)]">
          <ClipLines lines={["The collateral", "Eligibility layer", "for tokenized stocks."]} />
        </h1>

        <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:mt-16 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(1.15rem,1.8vw,1.5rem)] leading-[1.3] tracking-[-0.02em] text-ink"
            >
              Know which Stock Tokens can be collateral — and exactly why.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button href="/app/assets" variant="primary" size="lg" magnetic className="font-mono text-[12px] tracking-[0.08em] uppercase">
                Explore assets <ArrowRight size={15} />
              </Button>
              <Button href="/app/eligibility" variant="secondary" size="lg" magnetic className="font-mono text-[12px] tracking-[0.08em] uppercase">
                Check eligibility
              </Button>
            </motion.div>
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              aria-label="Properties"
              className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.1em] text-ink-3 uppercase"
            >
              {["Read-only", "Deterministic", "Evidence-backed"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden className="size-1 rounded-full bg-signal" />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.4 }} className="min-w-0">
            <div className="relative">
              <div aria-hidden className="pointer-events-none relative h-5">
                {COLUMNS.map((c) => (
                  <span
                    key={c.kind}
                    className={cn("label absolute top-0 whitespace-nowrap transition-colors", (hover?.kind ?? focus) === c.kind && "!text-ink")}
                    style={{ left: `calc(24px + ${c.at} * (100% - 48px))`, transform: `translateX(-${c.at * 100}%)` }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
              <div className="relative h-[300px] sm:h-[380px]">
                {loaded ? (
                  <StateField className="absolute inset-0 h-full w-full" assetStatus={statuses} checkCount={checks.length} policyCount={rules.length} focusKind={focus} onHover={setHover} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase">{ev.error ? "Registry unavailable" : "Reading registry…"}</div>
                )}
              </div>
              <div role="tablist" aria-label="Field focus" className="mt-2 flex flex-wrap gap-1.5">
                {COLUMNS.map((c) => (
                  <button
                    key={c.kind}
                    role="tab"
                    type="button"
                    aria-selected={focus === c.kind}
                    onClick={() => setFocus((f) => (f === c.kind ? null : c.kind))}
                    className={cn("h-7 rounded-xs border px-2.5 font-mono text-[10.5px] tracking-[0.08em] uppercase transition-colors", focus === c.kind ? "border-ink bg-ink text-on-ink" : "border-line-2 text-ink-2 hover:border-ink/50")}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div aria-live="polite" className="mt-3 min-h-[92px] border-t border-line pt-3">
                <div className="label">{readout.eyebrow}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <span className="text-[19px] leading-tight tracking-[-0.025em] text-ink">{readout.title}</span>
                  {"status" in readout && readout.status ? <StatusBadge status={readout.status} size="sm" /> : null}
                </div>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-3">{readout.body}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* live readout — every value is fetched; failures read UNKNOWN */}
        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink/80 pt-6 pb-14 sm:grid-cols-3 lg:mt-20 lg:grid-cols-5">
          <Metric label="Live assets" value={ev.assets.length} state={state} source="Robinhood" hint="registry" />
          <Metric label="Active" value={ev.active} state={state} source="Robinhood" hint="status" />
          <Metric label="Inactive" value={ev.inactive} state={state} source="Robinhood" hint="status" />
          <Metric label="Network" value="RH CHAIN" state="ok" source={DATA_MODE === "demo" ? "Demo" : "Chain 4663"} size="md" className="sm:col-start-auto" />
          <Metric
            label="Block"
            value={chain.data ? `#${chain.data.block.toLocaleString("en-US")}` : null}
            state={chainState}
            source="Onchain"
            hint={chainHealth === "LIVE" ? "live" : chain.data ? "last known" : undefined}
            size="md"
          />
        </dl>
      </div>
    </section>
  );
}
