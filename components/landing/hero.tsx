"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { BlurLines } from "@/components/ui/motion-bits";
import { Metric } from "@/components/live/metric";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLive } from "@/hooks/use-live";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import { HERO_DELAY, useHeroRevealed } from "./hero-intro";
import { HeroSphere, type HeroSphereHandle } from "./sphere/hero-sphere";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A piece of hero copy that rises in once the loader hands over. */
function Rise({ on, delay, y = 14, className, children, as = "div", "aria-label": ariaLabel }: { on: boolean; delay: number; y?: number; className?: string; children: React.ReactNode; as?: "div" | "p" | "ul" | "dl"; "aria-label"?: string }) {
  const Tag = motion[as] as typeof motion.div;
  const reduce = useReducedMotion();
  return (
    <Tag
      aria-label={ariaLabel}
      initial={{ opacity: 0, y }}
      animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: reduce ? 0.15 : 0.7, delay: on && !reduce ? delay : 0, ease: EASE }}
      className={className}
    >
      {children}
    </Tag>
  );
}

/**
 * Hero. Left: what COMMS is. Right: the live sphere — the same registry the rest of the site reads, drawn as a network.
 * The CTAs are wired to the sphere: exploring speeds the network up, checking eligibility runs the evaluation path.
 * Entrance order (after the loader hands over): nav → eyebrow → headline (line by line) → description → buttons → capabilities → readout;
 * the sphere has already started forming behind the loader, so it lands alongside the headline.
 */
export function Hero() {
  const ev = useEvaluated();
  const chain = useLive((s) => s.chain);
  const chainHealth = useSliceHealthFor("chain");
  const sphere = useRef<HeroSphereHandle>(null);
  const on = useHeroRevealed();

  const loaded = ev.assets.length > 0;
  const state = loaded ? "ok" : ev.error ? "unknown" : "loading";
  const chainState = chain.data ? "ok" : chain.error ? "unknown" : "loading";

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* system texture: fine grid + a faint teal field behind the sphere + micro-noise. ~1–3 % — subconscious. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-grid absolute inset-0" />
        <div className="hero-field absolute inset-0" />
        <div className="grain grain-soft absolute inset-0" />
      </div>

      <div className="mx-auto max-w-[1400px] px-5 pt-28 lg:px-10 lg:pt-32">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-4">
          <div className="relative z-10">
            <Rise on={on} delay={HERO_DELAY.eyebrow} y={8} className="label flex items-center gap-3">
              <span aria-hidden className="h-px w-8 bg-ink/40" />
              <span>Real-time collateral intelligence</span>
            </Rise>

            <h1
              id="hero-title"
              className="display mt-7 text-[clamp(1.9rem,9.6vw,3.7rem)] text-ink sm:text-[clamp(3rem,8.6vw,5rem)] lg:text-[clamp(3.1rem,5.1vw,4.9rem)] lg:leading-[0.94]"
            >
              <BlurLines lines={["The collateral", "eligibility layer", "for tokenized stocks."]} on={on} delay={HERO_DELAY.headline} step={HERO_DELAY.headlineStep} lastExtra={HERO_DELAY.headlineLast} />
            </h1>

            <Rise as="p" on={on} delay={HERO_DELAY.description} className="mt-8 max-w-[460px] text-[clamp(1.1rem,1.6vw,1.4rem)] leading-[1.3] tracking-[-0.02em] text-ink">
              Know which Stock Tokens can be collateral — and exactly why.
            </Rise>

            <Rise on={on} delay={HERO_DELAY.buttons} className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                href="/app/assets"
                variant="primary"
                size="lg"
                className="group font-mono text-[12px] tracking-[0.08em] uppercase hover:-translate-y-px"
                onMouseEnter={() => sphere.current?.explore(true)}
                onMouseLeave={() => sphere.current?.explore(false)}
                onFocus={() => sphere.current?.explore(true)}
                onBlur={() => sphere.current?.explore(false)}
              >
                Explore assets <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
              <Button
                href="/app/eligibility"
                variant="secondary"
                size="lg"
                className="font-mono text-[12px] tracking-[0.08em] uppercase hover:shadow-[inset_0_0_0_1px_rgb(10_10_10/0.55)]!"
                onMouseEnter={() => sphere.current?.evaluate()}
                onFocus={() => sphere.current?.evaluate()}
              >
                Check eligibility
              </Button>
            </Rise>

            <Rise as="ul" on={on} delay={HERO_DELAY.capabilities} y={8} aria-label="Properties" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.1em] text-ink-3 uppercase">
              {["Read-only", "Deterministic", "Evidence-backed", "Built for builders"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden className="size-1 rounded-full bg-signal" />
                  {t}
                </li>
              ))}
            </Rise>
          </div>

          {/* the sphere sits above the copy's plane and bleeds a little past the container edge on wide screens */}
          <div className="relative z-0 min-w-0 lg:-mr-6">
            <HeroSphere ref={sphere} />
          </div>
        </div>

        {/* live readout — every value is fetched; failures read UNKNOWN */}
        <Rise as="dl" on={on} delay={HERO_DELAY.readout} y={10} className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink/80 pt-6 pb-14 sm:grid-cols-3 lg:mt-14 lg:grid-cols-5">
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
        </Rise>
      </div>
    </section>
  );
}
