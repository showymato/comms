"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LogoMark } from "@/components/ui/logo";
import { useLive } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { cn } from "@/lib/utils";
import { setIntroPhase, useIntroPhase } from "./hero-intro";

const EASE = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** ms from mount */
const AT = {
  sphere: 480,
  rows: 520,
  rowStep: 110,
  morph: 1050,
  done: 1700,
} as const;

const WORD = "COMMS".split("");
/** each letter starts a few px off its slot and resolves into it */
const OFFSETS = [-9, 7, -5, 9, -7];

type Tone = "ready" | "reading" | "unknown" | "demo";
const DOT: Record<Tone, string> = { ready: "bg-eligible", reading: "bg-signal", unknown: "bg-unknown", demo: "bg-conditional" };

/**
 * Cinematic system initialisation. Not a spinner: the wordmark resolves, the four layers report in, the sphere starts to
 * form behind the paper, and then the wordmark flies into the navigation while the hero takes its place — one animation.
 *
 * The status rows describe the real system, not a script: the registry reads READY only once it has actually loaded, the
 * oracle layer has no verifiable source so it says UNKNOWN (the product's own vocabulary), demo builds say DEMO.
 */
export function HeroLoader() {
  const phase = useIntroPhase();
  const registry = useLive((s) => s.registry);
  const registryLoaded = registry.fetchedAt !== null && registry.fetchedAt !== undefined;

  const markRef = useRef<HTMLDivElement>(null);
  const [act, setAct] = useState(0);
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null);
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroPhase("done");
      return;
    }
    const later = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };
    for (let i = 0; i < 4; i++) later(AT.rows + 100 + i * AT.rowStep, () => setAct(i + 1));
    later(AT.sphere, () => setIntroPhase("sphere"));
    later(AT.morph, () => {
      // fly the wordmark to where the navigation logo sits (it is in the DOM, just not shown yet)
      const from = markRef.current?.getBoundingClientRect();
      const to = document.querySelector("[data-nav-logo]")?.getBoundingClientRect();
      if (from && to) setFly({ x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2) });
      setIntroPhase("morph");
    });
    later(AT.done, () => setIntroPhase("done"));

    // the loader never stands between a visitor and the page: any input skips ahead
    const skip = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setSkipped(true);
      setIntroPhase("sphere");
      setIntroPhase("morph");
      window.setTimeout(() => setIntroPhase("done"), 320);
    };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("pointerdown", skip, opts);
    window.addEventListener("wheel", skip, opts);
    window.addEventListener("touchstart", skip, opts);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("touchstart", skip);
    };
  }, []);

  if (phase === "done") return null;

  const rows: Array<{ label: string; word: string; tone: Tone; title: string }> = [
    {
      label: "Asset registry",
      word: DATA_MODE === "demo" ? "DEMO" : registryLoaded ? "READY" : "READING",
      tone: DATA_MODE === "demo" ? "demo" : registryLoaded ? "ready" : "reading",
      title: "Robinhood Stock Token registry",
    },
    { label: "State engine", word: "READY", tone: "ready", title: "Deterministic evaluator, running in this page" },
    {
      label: "Oracle layer",
      word: DATA_MODE === "demo" ? "DEMO" : "UNKNOWN",
      tone: DATA_MODE === "demo" ? "demo" : "unknown",
      title: "No verifiable oracle source yet — reported as UNKNOWN, never guessed",
    },
    { label: "Eligibility", word: "READY", tone: "ready", title: "Policy evaluation" },
  ];

  const scrimGone = phase !== "loader";
  const morphing = phase === "morph";

  return (
    <div aria-hidden className="intro-loader pointer-events-none fixed inset-0 z-[70]">
      {/* paper scrim: dissolves to reveal the sphere forming behind it */}
      <motion.div
        className="grain absolute inset-0 bg-base"
        initial={{ opacity: 1 }}
        animate={{ opacity: scrimGone ? 0 : 1 }}
        transition={{ duration: skipped ? 0.25 : 0.6, ease: "easeOut" }}
      />

      <motion.div className="absolute inset-0 grid place-items-center" initial={false} animate={{ opacity: skipped ? 0 : 1 }} transition={{ duration: 0.25 }}>
        <div className="flex w-[248px] flex-col items-center">
          {/* wordmark: resolves from horizontal offsets, locks, then becomes the navigation logo */}
          <motion.div
            ref={markRef}
            className="relative my-5 will-change-transform"
            initial={{ scale: 2.1, x: 0, y: 0 }}
            animate={morphing && fly ? { scale: 1, x: fly.x, y: fly.y } : { scale: 2.1, x: 0, y: 0 }}
            transition={{ duration: 0.62, ease: EASE_IN_OUT }}
          >
            <span className="inline-flex items-center gap-2.5 text-ink">
              <span className="intro-mark inline-flex" style={{ "--d": "260ms" } as CSSProperties}>
                <LogoMark size={26} tone="black" />
              </span>
              <span className="text-[15px] font-semibold tracking-[0.22em]">
                {WORD.map((ch, i) => (
                  <span key={i} className="relative inline-block">
                    <span className="intro-letter inline-block" style={{ "--ox": `${OFFSETS[i]}px`, "--d": `${40 + i * 30}ms` } as CSSProperties}>
                      {ch}
                    </span>
                    {/* the fragment it resolves from */}
                    <span aria-hidden className="intro-ghost absolute inset-0 inline-block text-signal" style={{ "--ox": `${-OFFSETS[i] * 0.9}px`, "--d": `${40 + i * 30}ms` } as CSSProperties}>
                      {ch}
                    </span>
                  </span>
                ))}
              </span>
            </span>
          </motion.div>

          {/* everything below the wordmark is CSS-animated so it plays from first paint, before the page has hydrated */}
          <motion.div
            className="flex w-full flex-col items-center"
            initial={false}
            animate={morphing || skipped ? { opacity: 0, y: -4, filter: "blur(4px)" } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <span className="intro-fade font-mono text-[9.5px] tracking-[0.28em] text-ink-3 uppercase" style={{ "--d": "300ms" } as CSSProperties}>
              Collateral intelligence
            </span>

            <div className="mt-9 w-full">
              <div className="intro-fade mb-2.5 flex items-center gap-2 font-mono text-[9.5px] tracking-[0.18em] text-ink-2 uppercase" style={{ "--d": "420ms" } as CSSProperties}>
                <span className="h-px w-3 bg-ink/30" />
                Connecting to infrastructure
              </div>
              <ul className="space-y-[7px]">
                {rows.map((r, i) => {
                  const on = act > i;
                  return (
                    <li
                      key={r.label}
                      title={r.title}
                      className="intro-fade flex items-center justify-between font-mono text-[9.5px] tracking-[0.16em] uppercase"
                      style={{ "--d": `${AT.rows + i * AT.rowStep}ms` } as CSSProperties}
                    >
                      <span className={cn("transition-colors duration-300", on ? "text-ink" : "text-ink-4")}>{r.label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className={cn("relative size-[5px] rounded-full transition-colors duration-300", on ? DOT[r.tone] : "bg-ink/20")}>
                          {on && r.tone === "reading" ? <span className="absolute inset-0 animate-pulse-ring rounded-full text-signal" /> : null}
                        </span>
                        <span className={cn("w-[52px] text-left transition-opacity duration-300", on ? "text-ink-2 opacity-100" : "opacity-0")}>{r.word}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
