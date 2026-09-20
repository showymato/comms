"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClipLines } from "@/components/ui/motion-bits";
import { LiveDot } from "@/components/ui/status";
import { LiveStrip } from "@/components/live/system-line";
import { CollateralField } from "./collateral-field";
import { EngineViz } from "./engine-viz";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // As the hero scrolls away, the engine zooms toward the viewer and hands off to the story section.
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.55]);
  const vizOpacity = useTransform(scrollYProgress, [0.35, 0.95], [1, reduce ? 1 : 0]);
  const vizBlur = useTransform(scrollYProgress, [0.4, 1], ["blur(0px)", reduce ? "blur(0px)" : "blur(6px)"]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -90]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.6], [1, reduce ? 1 : 0]);
  // depth: the field sits behind the content and travels at ~0.85× while the hero scrolls away
  const fieldY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 135]);

  return (
    <section ref={ref} aria-labelledby="hero-title" className="noise relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0" />
        <motion.div style={{ y: fieldY }} className="absolute inset-0 will-change-transform">
          <CollateralField className="absolute inset-0 h-full w-full" />
        </motion.div>
        <div className="glow-spectral absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-base to-transparent" />
      </div>

      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] min-h-svh max-w-[1320px] items-center gap-10 px-5 pt-28 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-8 lg:px-10 lg:pt-24">
        <motion.div style={{ y: copyY, opacity: copyOpacity }} className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="label flex items-center gap-2.5"
          >
            <LiveDot />
            <span>COMMS</span>
            <span aria-hidden className="text-ink-4">/</span>
            <span>Collateral intelligence</span>
          </motion.div>

          <h1 id="hero-title" className="display mt-7 text-[clamp(2.7rem,6.3vw,5.35rem)] text-ink">
            <ClipLines
              lines={[
                "Know which",
                <span key="st" className="text-spectral">
                  Stock Tokens
                </span>,
                "can be collateral.",
              ]}
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-[34rem] text-[17px] leading-relaxed text-ink-2"
          >
            COMMS evaluates tokenized-stock state, market infrastructure, restrictions and protocol policies to produce a deterministic collateral eligibility decision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.68, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button href="/assets" variant="primary" size="lg" magnetic>
              Explore the Registry <ArrowRight size={16} />
            </Button>
            <Button href="/api-reference" variant="ghost" size="lg" magnetic>
              Read the API <ArrowRight size={16} className="text-ink-3" />
            </Button>
          </motion.div>

          <LiveStrip className="mt-8" />

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-12 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase"
            aria-label="Properties"
          >
            {["Read-only", "No custody", "Deterministic", "Every decision explained"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden className="size-1 rounded-full bg-cyan/70" />
                {t}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-0"
        >
          <motion.div style={{ scale, opacity: vizOpacity, filter: vizBlur }} className="will-change-transform">
            <EngineViz />
            <p className="mt-3 text-center font-mono text-[10px] tracking-[0.1em] text-ink-4">ILLUSTRATIVE ENGINE · DEMO DATA</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
