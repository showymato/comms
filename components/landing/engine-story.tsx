"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { ASSETS } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { DecisionCard } from "@/components/eligibility/decision-card";
import { ResultTag, StatusGlyph } from "@/components/ui/status";
import { SectionEyebrow } from "@/components/ui/primitives";
import { eligibilityService } from "@/lib/services";
import { formatClock, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "Asset", title: "Start with a Stock Token", body: "A protocol submits one tokenized stock: a single contract address on RH Chain." },
  { key: "State", title: "Read its current state", body: "Transfers, oracle, redemption and restrictions, each captured with a source, a block and a timestamp." },
  { key: "Checks", title: "Run deterministic checks", body: "Nine checks. The same state always produces the same answer." },
  { key: "Policy", title: "Apply the protocol's policy", body: "Minimum liquidity and the oracle, transfer and redemption requirements are set by the protocol, not by COMMS." },
  { key: "Decision", title: "One decision, with reasons", body: "9 checks passed. 0 failed. 0 unknown. The answer is ELIGIBLE, and every reason is on the record." },
] as const;

const R = 92;
const seg = (i: number) => {
  const p = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(120 + R * Math.cos(a)).toFixed(2)} ${(120 + R * Math.sin(a)).toFixed(2)}`;
  };
  const a0 = -90 + i * 40 + 4;
  return `M${p(a0)} A${R} ${R} 0 0 1 ${p(a0 + 32)}`;
};

export function EngineStory() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const s = Math.max(0, Math.min(4, Math.floor(p * 5)));
    const local = p * 5 - s;
    setStep(s);
    setLit(s < 2 ? 0 : s > 2 ? 9 : Math.min(9, Math.floor(local * 10)));
  });

  const asset = ASSETS[0];
  const result = useMemo(() => eligibilityService.evaluate(asset, POLICIES[0]), [asset]);

  return (
    <section id="engine" ref={ref} aria-labelledby="engine-title" className="relative h-[560vh]">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="bg-grid-fine absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_60%_55%_at_65%_50%,#000,transparent_80%)]" />
          <div className="absolute top-1/2 right-[8%] size-[720px] -translate-y-1/2 rounded-full bg-cyan/[0.045] blur-3xl" />
        </div>

        <div className="relative mx-auto grid grid-cols-[minmax(0,1fr)] w-full max-w-[1320px] gap-8 px-5 pt-16 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-16 lg:px-10 lg:pt-0">
          {/* copy */}
          <div>
            <SectionEyebrow index="03">The eligibility engine</SectionEyebrow>
            <h2 id="engine-title" className="display mt-5 text-[clamp(1.9rem,4vw,3.4rem)]">
              One decision.
              <br />
              <span className="text-spectral">Multiple layers</span> of evidence.
            </h2>

            <ol className="relative mt-8 hidden lg:block">
              <span aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px bg-line-2" />
              <motion.span aria-hidden className="absolute top-2 bottom-2 left-[5px] w-px origin-top bg-cyan" style={{ scaleY: fill }} />
              {STEPS.map((s, i) => {
                const active = i === step;
                return (
                  <li key={s.key} className="relative pb-5 pl-8 last:pb-0" aria-current={active ? "step" : undefined}>
                    <span
                      aria-hidden
                      className={cn("absolute top-[7px] left-0 size-[11px] rounded-full border transition-colors duration-300", i <= step ? "border-cyan bg-cyan" : "border-line-2 bg-base")}
                    />
                    <div className="flex items-baseline gap-3">
                      <span className={cn("font-mono text-[10.5px] tracking-[0.1em] uppercase transition-colors", active ? "text-cyan" : "text-ink-4")}>{s.key}</span>
                      <span className={cn("text-[15px] font-medium transition-colors", active ? "text-ink" : "text-ink-3")}>{s.title}</span>
                    </div>
                    <div className={cn("grid transition-[grid-template-rows,opacity] duration-300", active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                      <p className="overflow-hidden pt-1.5 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* compact copy on small screens */}
            <div className="mt-5 lg:hidden">
              <div className="font-mono text-[10.5px] tracking-[0.1em] text-cyan uppercase">
                {step + 1}/5 · {STEPS[step].key}
              </div>
              <p className="mt-1 text-[15px] font-medium text-ink">{STEPS[step].title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{STEPS[step].body}</p>
            </div>
          </div>

          {/* stage */}
          <div className="relative rounded-xl border border-line-2 bg-base-1/90 shadow-[0_40px_120px_rgba(0,0,0,0.5)] backdrop-blur-sm" role="group" aria-label={`Engine stage: ${STEPS[step].key}`}>
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex flex-1 items-center gap-2 last:flex-none">
                  <span className={cn("font-mono text-[9.5px] tracking-[0.1em] uppercase transition-colors", i === step ? "text-cyan" : i < step ? "text-ink-2" : "text-ink-4")}>{s.key}</span>
                  {i < STEPS.length - 1 ? <span className={cn("h-px flex-1 transition-colors duration-500", i < step ? "bg-cyan/60" : "bg-line-2")} /> : null}
                </div>
              ))}
            </div>

            <div className="relative h-[340px] overflow-hidden p-5 sm:h-[400px] lg:h-[460px] lg:p-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full"
                >
                  {step === 0 ? (
                    <div className="flex h-full flex-col justify-center">
                      <div className="label">Stock Token</div>
                      <div className="mt-3 text-[clamp(3rem,7vw,5.5rem)] leading-none font-semibold tracking-[-0.05em]">{asset.symbol}</div>
                      <div className="mt-2 text-lg text-ink-2">{asset.name}</div>
                      <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] text-ink-2">
                        <span className="rounded-xs border border-line-2 px-2 py-1">{shortAddress(asset.address, 8, 6)}</span>
                        <span className="rounded-xs border border-line-2 px-2 py-1">RH CHAIN</span>
                        <span className="rounded-xs border border-cyan/30 bg-cyan/10 px-2 py-1 text-cyan">SUBMITTED</span>
                      </div>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div className="flex h-full flex-col justify-center">
                      <div className="label mb-3">Asset state · evidence</div>
                      {(
                        [
                          ["transferEnabled", "TRUE", asset.state.transferEnabled],
                          ["oracleHealthy", "TRUE", asset.state.oracleHealthy],
                          ["priceFresh", "TRUE", asset.state.priceFresh],
                          ["redemptionEnabled", "TRUE", asset.state.redemptionEnabled],
                          ["paused", "FALSE", asset.state.paused],
                          ["issuerRestricted", "FALSE", asset.state.issuerRestricted],
                        ] as const
                      ).map(([k, v, e], i) => (
                        <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }} className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line py-2 font-mono text-[11.5px] last:border-0 sm:grid-cols-[1.4fr_0.6fr_1fr]">
                          <span className="text-ink">{k}</span>
                          <span className="text-cyan">{v}</span>
                          <span className="hidden text-right text-ink-3 sm:block">
                            {e.source} · #{e.blockNumber.toLocaleString("en-US")} · {formatClock(e.timestamp)}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div className="grid h-full items-center gap-6 sm:grid-cols-[auto_1fr]">
                      <svg viewBox="0 0 240 240" className="mx-auto w-[min(56%,210px)] sm:w-[220px]" aria-hidden>
                        {Array.from({ length: 9 }, (_, i) => (
                          <g key={i}>
                            <path d={seg(i)} stroke="rgb(255 255 255 / 0.12)" strokeWidth="7" fill="none" />
                            <path d={seg(i)} stroke={lit >= 9 ? "#39E58C" : "#54D6FF"} strokeWidth="7" fill="none" style={{ opacity: i < lit ? 1 : 0, transition: "opacity .25s, stroke .3s" }} />
                          </g>
                        ))}
                        <text x="120" y="126" textAnchor="middle" className="fill-ink" style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.04em" }}>
                          {lit}
                        </text>
                        <text x="120" y="148" textAnchor="middle" className="fill-ink-3" style={{ fontSize: 10, letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}>
                          OF 9 CHECKS
                        </text>
                      </svg>
                      <ol className="hidden gap-px sm:grid">
                        {result.checks.map((c, i) => (
                          <li key={c.id} className="flex items-center justify-between gap-3 py-[5px] text-[12.5px]">
                            <span className={i < lit ? "text-ink" : "text-ink-4"}>{c.label}</span>
                            <span className={cn("transition-opacity duration-200", i < lit ? "opacity-100" : "opacity-0")}>
                              <ResultTag result={c.result} text={c.passLabel} />
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {step === 3 ? (
                    <div className="flex h-full flex-col justify-center">
                      <div className="label mb-3">Policy · DEFAULT</div>
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-x-4 border-b border-line pb-2 font-mono text-[10px] tracking-[0.08em] text-ink-4 uppercase">
                        <span>Requirement</span>
                        <span>Asset</span>
                        <span />
                      </div>
                      {result.rules.map((r, i) => (
                        <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="grid grid-cols-[1fr_1fr_auto] items-center gap-x-4 border-b border-line py-3 last:border-0">
                          <span>
                            <span className="block text-[13.5px] text-ink">{r.label}</span>
                            <span className="block font-mono text-[11px] text-ink-3">{r.requirement}</span>
                          </span>
                          <span className="font-mono text-[12px] text-ink-2">{r.actual}</span>
                          <span className="text-eligible">
                            <StatusGlyph status="ELIGIBLE" size={16} />
                            <span className="sr-only">met</span>
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  ) : null}

                  {step === 4 ? (
                    <div className="grid h-full place-items-center">
                      <DecisionCard result={result} size="md" className="w-full max-w-md" updated="Evaluated just now" />
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
