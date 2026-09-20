"use client";

import { Metric } from "@/components/live/metric";
import { Reveal } from "@/components/ui/motion-bits";
import { WordReveal } from "@/components/ui/word-reveal";
import { useEvaluated } from "@/hooks/use-evaluated";
import { CHECK_COUNT } from "@/lib/engine";

/** BIG STATEMENT → supporting copy → large metric. The metric is computed from live evidence, never typed in. */
export function Statement() {
  const ev = useEvaluated();
  const total = ev.assets.length * CHECK_COUNT;
  const verified = ev.coverage.reduce((n, c) => n + c.pass + c.fail, 0);
  const pct = total > 0 ? Math.round((verified / total) * 100) : null;
  const state = total > 0 ? "ok" : ev.error ? "unknown" : "loading";

  return (
    <section aria-labelledby="statement-title" className="relative py-28 lg:py-44">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <Reveal>
          <div className="label flex items-center gap-3">
            <span className="text-ink">01</span>
            <span aria-hidden className="h-px w-8 bg-line-2" />
            <span>The problem</span>
          </div>
        </Reveal>
        <WordReveal as="h2" text="A price is not permission. Before collateral enters a protocol it needs a decision — and the evidence behind it." className="display display-lg mt-10 max-w-[18ch] text-ink lg:max-w-[22ch]" />
        <span id="statement-title" className="sr-only">
          A price is not permission
        </span>

        <div className="mt-20 grid grid-cols-[minmax(0,1fr)] gap-12 border-t border-ink/80 pt-8 lg:mt-28 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="max-w-md text-[17px] leading-[1.55] text-ink-2">
              Tokenized stocks can be paused, restricted, split or redeemed at any time. COMMS reads the state that decides whether a token is safe to accept, applies your policy, and returns one of four answers.
              When a piece of evidence is missing, the answer says so.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-10 sm:grid-cols-2">
              <Metric size="xl" label="Evidence coverage" value={pct === null ? null : `${pct}%`} state={state} source="COMMS engine" hint="live evidence" />
              <div className="self-end text-[14px] leading-relaxed text-ink-3">
                {state === "ok" ? (
                  <>
                    <span className="tabular text-ink">{verified.toLocaleString("en-US")}</span> of <span className="tabular text-ink">{total.toLocaleString("en-US")}</span> check results ({ev.assets.length} assets × {CHECK_COUNT} checks) are backed by evidence COMMS can
                    read today. The remainder are UNKNOWN — not passed, not failed.
                  </>
                ) : (
                  "Computed from the live registry as soon as it loads."
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
