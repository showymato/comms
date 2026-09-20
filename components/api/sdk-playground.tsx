"use client";

import { AnimatePresence, motion } from "motion/react";
import { Play } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { ASSETS } from "@/data/assets";
import { LANGUAGES, json, sdkSample, type Language } from "@/data/api-docs";
import { toApiResponse } from "@/lib/api-shape";
import { eligibilityService } from "@/lib/services";
import type { EligibilityResult } from "@/types";
import { cn } from "@/lib/utils";

const PICKS = ["AAPL", "TSLA", "NFLX", "AMD"];

/** Interactive SDK: pick a language and policy mode, run the call, watch the response arrive. */
export function SdkPlayground({ className }: { className?: string }) {
  const [lang, setLang] = useState<Language>("javascript");
  const [custom, setCustom] = useState(false);
  const [symbol, setSymbol] = useState("AAPL");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [run, setRun] = useState(0);
  const [ms, setMs] = useState(0);

  const sample = sdkSample(lang, custom);

  async function execute() {
    const asset = ASSETS.find((a) => a.symbol === symbol)!;
    setBusy(true);
    const t0 = performance.now();
    const r = await eligibilityService.check(asset.address, custom ? "INSTITUTIONAL" : "DEFAULT");
    setMs(Math.round(performance.now() - t0));
    setResult(r);
    setRun((n) => n + 1);
    setBusy(false);
  }

  return (
    <div className={cn("grid gap-4 lg:grid-cols-2", className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs label="Language" value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))} size="sm" />
          <Tabs label="Policy" value={custom ? "custom" : "default"} onChange={(v) => setCustom(v === "custom")} options={[{ id: "default", label: "Default policy" }, { id: "custom", label: "Custom policy" }]} size="sm" />
        </div>
        <CodeBlock code={sample.code} lang={sample.hl} title={lang === "curl" ? "shell" : `eligibility.${lang === "python" ? "py" : lang === "typescript" ? "ts" : "js"}`} lineNumbers className="flex-1" />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="accent" onClick={() => void execute()} disabled={busy} magnetic className="font-mono tracking-[0.06em]">
            <Play size={13} fill="currentColor" /> {busy ? "RUNNING…" : "RUN"}
          </Button>
          <div role="group" aria-label="tokenAddress" className="flex items-center gap-1.5">
            <span className="label">tokenAddress</span>
            {PICKS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={symbol === s}
                onClick={() => setSymbol(s)}
                className={cn("h-6 rounded-xs border px-2 font-mono text-[11px] transition-colors", symbol === s ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-ink-2 hover:text-ink")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-line bg-base-1">
        <div className="flex items-center justify-between border-b border-line bg-white/2 px-3 py-2">
          <span className="font-mono text-[11px] text-ink-3">response</span>
          {result ? (
            <span className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
              <span className="text-eligible">200 OK</span> · {ms} ms · demo
            </span>
          ) : null}
        </div>
        <div className="flex-1 p-4" aria-live="polite">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key={run} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-3 flex items-center gap-3 font-mono text-[12px]">
                  <span className="text-ink-3">result.eligible</span>
                  <span className={result.status === "ELIGIBLE" ? "text-eligible" : "text-ineligible"}>{String(result.status === "ELIGIBLE")}</span>
                  <StatusBadge status={result.status} size="sm" className="ml-auto" />
                </div>
                <CodeBlock code={json(toApiResponse(result))} lang="json" title="EligibilityResult" reveal key={run} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-full min-h-[280px] place-items-center text-center">
                <div>
                  <p className="font-mono text-[12px] text-ink-3">No request yet</p>
                  <p className="mt-1 text-[13px] text-ink-4">Press RUN to call the demo engine.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
