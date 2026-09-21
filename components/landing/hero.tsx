"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ClipLines } from "@/components/ui/motion-bits";
import { Metric } from "@/components/live/metric";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLive } from "@/hooks/use-live";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import { HeroSphere, type HeroSphereHandle } from "./sphere/hero-sphere";

/**
 * Hero. Left: what COMMS is. Right: the live sphere — the same registry the rest of the site reads, drawn as a network.
 * The CTAs are wired to the sphere: exploring speeds the network up, checking eligibility runs the evaluation path.
 */
export function Hero() {
  const ev = useEvaluated();
  const chain = useLive((s) => s.chain);
  const chainHealth = useSliceHealthFor("chain");
  const sphere = useRef<HeroSphereHandle>(null);

  const loaded = ev.assets.length > 0;
  const state = loaded ? "ok" : ev.error ? "unknown" : "loading";
  const chainState = chain.data ? "ok" : chain.error ? "unknown" : "loading";

  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-grid absolute inset-0 opacity-70" />
        <div className="glow-spectral absolute inset-0" />
      </div>

      <div className="mx-auto max-w-[1400px] px-5 pt-28 lg:px-10 lg:pt-32">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-6">
          <div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="label flex items-center gap-3">
              <span className="text-ink">COMMS</span>
              <span aria-hidden className="h-px w-8 bg-line-2" />
              <span>Collateral intelligence</span>
            </motion.div>

            <h1 id="hero-title" className="display mt-7 text-[clamp(2.35rem,9.2vw,3.6rem)] text-ink uppercase sm:text-[clamp(2.6rem,7.4vw,4.6rem)] lg:text-[clamp(2.7rem,4.1vw,4.7rem)]">
              <ClipLines lines={["The collateral", "Eligibility layer", "for tokenized stocks."]} />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 max-w-[460px] text-[clamp(1.1rem,1.6vw,1.4rem)] leading-[1.3] tracking-[-0.02em] text-ink"
            >
              Know which Stock Tokens can be collateral — and exactly why.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.62, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button
                href="/app/assets"
                variant="primary"
                size="lg"
                magnetic
                className="group font-mono text-[12px] tracking-[0.08em] uppercase"
                onMouseEnter={() => sphere.current?.explore(true)}
                onMouseLeave={() => sphere.current?.explore(false)}
                onFocus={() => sphere.current?.explore(true)}
                onBlur={() => sphere.current?.explore(false)}
              >
                Explore assets <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
              <Button
                href="/app/eligibility"
                variant="secondary"
                size="lg"
                magnetic
                className="font-mono text-[12px] tracking-[0.08em] uppercase"
                onMouseEnter={() => sphere.current?.evaluate()}
                onFocus={() => sphere.current?.evaluate()}
              >
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
              {["Read-only", "Deterministic", "Evidence-backed", "Built for builders"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden className="size-1 rounded-full bg-signal" />
                  {t}
                </li>
              ))}
            </motion.ul>
          </div>

          <div className="min-w-0">
            <HeroSphere ref={sphere} />
          </div>
        </div>

        {/* live readout — every value is fetched; failures read UNKNOWN */}
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-ink/80 pt-6 pb-14 sm:grid-cols-3 lg:mt-14 lg:grid-cols-5">
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
