"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion-bits";
import { StatusList } from "@/components/live/status-list";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="theme-ink relative isolate overflow-hidden py-28 lg:py-44">
      <div aria-hidden className="glow-top pointer-events-none absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-16 px-5 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-7">
          <Reveal>
            <h2 id="cta-title" className="display display-xl text-ink">
              Build with certainty.
            </h2>
            <p className="mt-8 max-w-xl text-[clamp(1.1rem,1.8vw,1.4rem)] leading-[1.4] tracking-[-0.02em] text-ink-2">Give your protocol a deterministic answer before collateral enters the system.</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-3">
            <Button href="/app/assets" variant="primary" size="lg" magnetic className="font-mono text-[12px] tracking-[0.08em] uppercase">
              Explore assets <ArrowRight size={15} />
            </Button>
            <Button href="/developers/quickstart" variant="secondary" size="lg" magnetic className="font-mono text-[12px] tracking-[0.08em] uppercase">
              Start building
            </Button>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="self-end lg:col-span-5">
          <StatusList />
        </Reveal>
      </div>
    </section>
  );
}
