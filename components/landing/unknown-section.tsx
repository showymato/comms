"use client";

import { Reveal } from "@/components/ui/motion-bits";
import { useEvaluated } from "@/hooks/use-evaluated";
import { formatTimestamp } from "@/lib/format";
import { useLive } from "@/hooks/use-live";

/** UNKNOWN is a feature. The example on the right is a real check from the live registry, not a mock-up. */
export function UnknownSection() {
  const ev = useEvaluated();
  const chain = useLive((s) => s.chain);
  const gap = ev.coverage.filter((c) => c.unknown > 0 && c.pass + c.fail === 0)[0] ?? ev.coverage.find((c) => c.unknown > 0) ?? null;
  const total = ev.assets.length;

  return (
    <section aria-labelledby="unknown-title" className="relative overflow-hidden py-28 lg:py-40">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] items-center gap-16 px-5 lg:grid-cols-12 lg:px-10">
        <div className="relative lg:col-span-6">
          <div aria-hidden className="select-none text-[clamp(14rem,34vw,32rem)] leading-[0.72] font-medium tracking-[-0.08em] text-ink/[0.07]">
            ?
          </div>
          <Reveal className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="label">Transferability</div>
              <div className="mt-3 text-[clamp(2.4rem,5vw,4.5rem)] leading-none font-medium tracking-[-0.05em] text-unknown">UNKNOWN</div>
              <div className="mt-3 font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase">Evidence unavailable</div>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal>
            <div className="label flex items-center gap-3">
              <span className="text-ink">03</span>
              <span aria-hidden className="h-px w-8 bg-line-2" />
              <span>Unknown is a feature</span>
            </div>
            <h2 id="unknown-title" className="display display-md mt-8 max-w-[16ch] text-ink">
              When the evidence isn’t there, we say so.
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-[1.6] text-ink-2">
              Most systems quietly treat “no data” as “fine”. COMMS treats it as a fourth answer. An unverified check is UNKNOWN, and a decision that depends on it is UNKNOWN too — so a protocol can decide what to do, instead of being told something untrue.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 border-t border-ink/80">
              {gap && total ? (
                <dl className="divide-y divide-line text-[13.5px]">
                  {[
                    ["Check", gap.label],
                    ["Result", `UNKNOWN for ${gap.unknown} of ${total} assets`],
                    ["Source", gap.sources.length ? gap.sources.join(", ") : "None — no verifiable source"],
                    ["Network", "Robinhood Chain · 4663"],
                    ["Block", chain.data ? `#${chain.data.block.toLocaleString("en-US")}` : "UNKNOWN"],
                    ["Observed", ev.assets[0]?.live ? `${formatTimestamp(ev.assets[0].live.registryFetchedAt)} UTC` : "UNKNOWN"],
                    ["Confidence", "Not reported"],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 py-3">
                      <dt className="font-mono text-[11px] tracking-[0.08em] text-ink-3 uppercase">{k}</dt>
                      <dd className="font-mono text-[12.5px] break-words text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="py-4 font-mono text-[12.5px] text-ink-3">The live evidence gap appears here as soon as the registry loads.</p>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
