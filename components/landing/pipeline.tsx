"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/status";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLive } from "@/hooks/use-live";
import { cn } from "@/lib/utils";
import type { EligibilityStatus } from "@/types";

const STEPS = [
  { n: "01", title: "Resolve the asset", body: "A contract address or symbol is matched against the Robinhood Stock Token registry. An address the registry does not know is reported as unregistered — never assumed." },
  { n: "02", title: "Read live state", body: "Contract state is read from Robinhood Chain at a pinned block. Lifecycle and quotes come from Robinhood's API. Every value keeps its source and timestamp." },
  { n: "03", title: "Check the evidence", body: "Nine checks each return PASS, FAIL or UNKNOWN. A check with no verifiable source is UNKNOWN. Missing evidence is never turned into a pass." },
  { n: "04", title: "Apply your policy", body: "Liquidity, oracle, transfer and redemption requirements decide which checks are decisive. Change the policy and the answer changes deterministically." },
  { n: "05", title: "Return a decision", body: "ELIGIBLE, INELIGIBLE, CONDITIONAL or UNKNOWN — with the reasons and every piece of evidence that produced it." },
] as const;

const ORDER: EligibilityStatus[] = ["ELIGIBLE", "CONDITIONAL", "INELIGIBLE", "UNKNOWN"];

/** Sticky storytelling: the copy on the left advances with scroll while the live evidence on the right lights up stage by stage. */
export function Pipeline() {
  const ev = useEvaluated();
  const chain = useLive((s) => s.chain);
  const outer = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [desktop, setDesktop] = useState(false);
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (p) => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length * 0.999)))));
  const lit = desktop ? step : STEPS.length - 1;
  const total = ev.assets.length;

  return (
    <section id="infrastructure" aria-labelledby="pipeline-title" className="theme-ink relative scroll-mt-16">
      <div ref={outer} className="lg:h-[440vh]">
        <div className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:items-center lg:overflow-hidden">
          <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-14 px-5 py-24 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:py-0">
            <div className="lg:col-span-5">
              <div className="label flex items-center gap-3">
                <span className="text-ink">02</span>
                <span aria-hidden className="h-px w-8 bg-line-2" />
                <span>Infrastructure</span>
              </div>
              <h2 id="pipeline-title" className="display display-md mt-8 max-w-[14ch] text-ink">
                From address to decision, in five stages.
              </h2>
              <ol className="mt-10 space-y-0">
                {STEPS.map((s, i) => (
                  <li key={s.n} className={cn("border-t border-line py-4 transition-opacity duration-500", i === lit || !desktop ? "opacity-100" : "opacity-30")}>
                    <div className="flex items-baseline gap-4">
                      <span className={cn("font-mono text-[11px]", i === lit && desktop ? "text-signal" : "text-ink-3")}>{s.n}</span>
                      <span className="text-[19px] tracking-[-0.02em] text-ink">{s.title}</span>
                    </div>
                    <p className={cn("overflow-hidden pl-9 text-[14px] leading-relaxed text-ink-2 transition-[max-height,opacity,margin] duration-500", i === lit || !desktop ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0")}>{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-xl border border-line bg-surface p-5 shadow-float lg:p-7">
                <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase">
                  <span>Live evidence ledger</span>
                  <span>{chain.data ? `Block #${chain.data.block.toLocaleString("en-US")}` : "Block UNKNOWN"}</span>
                </div>

                <div className={cn("mt-5 border-t border-line pt-4 transition-opacity duration-500", lit >= 0 ? "opacity-100" : "opacity-30")}>
                  <div className="label">Registry</div>
                  <div className="mt-1 text-[22px] tracking-[-0.03em] text-ink tabular">{total ? `${total} Stock Tokens resolved` : ev.error ? "UNKNOWN" : "Resolving…"}</div>
                </div>

                <div className={cn("mt-4 border-t border-line pt-4 transition-opacity duration-500", lit >= 1 ? "opacity-100" : "opacity-25")}>
                  <div className="label mb-3">Checks · coverage across {total || "—"} assets</div>
                  <ul className="space-y-2.5">
                    {(ev.coverage.length ? ev.coverage : Array.from({ length: 9 }, () => null)).map((c, i) => {
                      const tot = c ? c.pass + c.fail + c.unknown : 0;
                      const seg = (n: number) => (tot ? `${(n / tot) * 100}%` : "0%");
                      return (
                        <li key={c?.id ?? i} className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 text-[12.5px] transition-opacity duration-500 sm:grid-cols-[170px_minmax(0,1fr)_120px]", lit >= 2 ? "opacity-100" : lit === 1 && c && c.pass + c.fail > 0 ? "opacity-100" : "opacity-40")}>
                          <span className="truncate text-ink-2">{c?.label ?? "…"}</span>
                          <span aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-ink/8">
                            <motion.span className="bg-eligible" animate={{ width: seg(c?.pass ?? 0) }} transition={{ duration: 0.8 }} />
                            <motion.span className="bg-ineligible" animate={{ width: seg(c?.fail ?? 0) }} transition={{ duration: 0.8 }} />
                            <motion.span className="bg-ink/25" animate={{ width: seg(c?.unknown ?? 0) }} transition={{ duration: 0.8 }} />
                          </span>
                          <span className="hidden text-right font-mono text-[10.5px] tracking-[0.06em] text-ink-3 sm:block">
                            {c ? (c.pass + c.fail === 0 ? "UNKNOWN" : `${c.pass + c.fail}/${tot} VERIFIED`) : "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 font-mono text-[10.5px] text-ink-3">
                    <span className="text-eligible">■</span> pass <span className="ml-2 text-ineligible">■</span> fail <span className="ml-2 text-ink-4">■</span> unknown — no verifiable source
                  </p>
                </div>

                <div className={cn("mt-4 border-t border-line pt-4 transition-opacity duration-500", lit >= 3 ? "opacity-100" : "opacity-25")}>
                  <div className="label mb-2">Policy · {ev.policy.name}</div>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] text-ink-2">
                    {(ev.results[0]?.rules ?? []).map((r) => (
                      <li key={r.id} className="flex justify-between gap-3">
                        <span>{r.label}</span>
                        <span className="font-mono text-ink">{r.requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={cn("mt-4 border-t border-line pt-4 transition-opacity duration-500", lit >= 4 ? "opacity-100" : "opacity-25")}>
                  <div className="label mb-3">Decisions</div>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ORDER.map((s) => (
                      <li key={s} className="rounded-md border border-line p-3">
                        <div className="tabular text-[26px] leading-none tracking-[-0.04em] text-ink">{total ? ev.counts[s] : "—"}</div>
                        <div className="mt-2">
                          <StatusBadge status={s} size="sm" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
