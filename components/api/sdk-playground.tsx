"use client";

import { AnimatePresence, motion } from "motion/react";
import { Play } from "lucide-react";
import { useState } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { ASSETS } from "@/data/assets";
import { useAssets } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import type { EligibilityStatus } from "@/types";
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
  const [liveRes, setLiveRes] = useState<{ http: number; body: { data?: { status?: EligibilityStatus; eligible?: boolean } & Record<string, unknown>; meta?: { error?: string } } } | null>(null);
  const [netError, setNetError] = useState<string | null>(null);
  const { assets } = useAssets();
  const demo = DATA_MODE === "demo";

  const sample = sdkSample(lang, custom);

  async function execute() {
    setBusy(true);
    setNetError(null);
    const t0 = performance.now();
    if (demo) {
      const asset = ASSETS.find((a) => a.symbol === symbol)!;
      const r = await eligibilityService.check(asset.address, custom ? "INSTITUTIONAL" : "DEFAULT");
      setMs(Math.round(performance.now() - t0));
      setResult(r);
    } else {
      // A real request to the COMMS backend: POST /api/eligibility/check → live evidence → deterministic engine.
      const asset = assets.find((a) => a.symbol === symbol);
      try {
        const res = await fetch("/api/eligibility/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ asset: asset?.address ?? symbol, policy: custom ? "INSTITUTIONAL" : "DEFAULT" }),
        });
        const body = await res.json();
        setMs(Math.round(performance.now() - t0));
        setLiveRes({ http: res.status, body });
      } catch (e) {
        setNetError(e instanceof Error ? e.message : "Request failed");
        setLiveRes(null);
      }
    }
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
            {(demo ? PICKS : PICKS.filter((p) => assets.some((a) => a.symbol === p))).map((s) => (
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
          {result || liveRes ? (
            <span className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
              <span className={demo || liveRes?.http === 200 ? "text-eligible" : "text-ineligible"}>{demo ? "200 OK" : `${liveRes?.http}`}</span> · {ms} ms · {demo ? "API SANDBOX · DEMO MODE" : "POST /api/eligibility/check"}
            </span>
          ) : null}
        </div>
        <div className="flex-1 p-4" aria-live="polite">
          <AnimatePresence mode="wait">
            {!demo && (liveRes || netError) ? (
              <motion.div key={`l-${run}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {netError ? (
                  <p className="font-mono text-[12px] text-conditional">Request failed: {netError}</p>
                ) : (
                  <>
                    {liveRes?.body.data?.status ? (
                      <div className="mb-3 flex items-center gap-3 font-mono text-[12px]">
                        <span className="text-ink-3">data.eligible</span>
                        <span className={liveRes.body.data.eligible ? "text-eligible" : "text-ink-2"}>{String(Boolean(liveRes.body.data.eligible))}</span>
                        <StatusBadge status={liveRes.body.data.status} size="sm" className="ml-auto" />
                      </div>
                    ) : null}
                    <CodeBlock code={json(liveRes?.body.data ?? liveRes?.body ?? {})} lang="json" title="EligibilityResult · live" reveal key={run} />
                  </>
                )}
              </motion.div>
            ) : null}
            {demo && result ? (
              <motion.div key={run} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-3 flex items-center gap-3 font-mono text-[12px]">
                  <span className="text-ink-3">result.eligible</span>
                  <span className={result.status === "ELIGIBLE" ? "text-eligible" : "text-ineligible"}>{String(result.status === "ELIGIBLE")}</span>
                  <StatusBadge status={result.status} size="sm" className="ml-auto" />
                </div>
                <CodeBlock code={json(toApiResponse(result))} lang="json" title="EligibilityResult" reveal key={run} />
              </motion.div>
            ) : null}
            {!result && !liveRes && !netError ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid h-full min-h-[280px] place-items-center text-center">
                <div>
                  <p className="font-mono text-[12px] text-ink-3">No request yet</p>
                  <p className="mt-1 text-[13px] text-ink-4">{demo ? "Press RUN to call the demo engine." : "Press RUN to send a real request to the COMMS backend."}</p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
