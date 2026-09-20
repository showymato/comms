"use client";

import { Metric } from "@/components/live/metric";
import { Reveal } from "@/components/ui/motion-bits";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLive, useNowMs } from "@/hooks/use-live";
import { useSystemStatus } from "@/hooks/use-system-status";
import { healthWord } from "@/components/live/status-list";
import { formatTimestamp } from "@/lib/format";

const AUDIENCES = [
  ["DeFi protocols", "Decide whether a Stock Token may enter a lending or collateral market."],
  ["Risk teams", "Read the evidence behind every decision and set the policy that governs it."],
  ["Asset issuers", "See exactly how an asset is judged and which evidence is missing."],
  ["Developers", "One typed API and SDK. Four outcomes to handle."],
  ["Financial infrastructure", "A deterministic, read-only layer that never custodies, lends or trades."],
] as const;

/** BUILT FOR — audiences, and only measured product facts. No customers, TVL or partnerships are claimed anywhere. */
export function BuiltFor() {
  const ev = useEvaluated();
  const status = useSystemStatus();
  const registry = useLive((s) => s.registry);
  const now = useNowMs(60_000);
  const api = status.find((r) => r.id === "api");
  const sync = registry.lastOkAt;

  return (
    <section aria-labelledby="built-title" className="relative border-t border-line py-28 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <Reveal>
          <div className="label flex items-center gap-3">
            <span className="text-ink">09</span>
            <span aria-hidden className="h-px w-8 bg-line-2" />
            <span>Built for</span>
          </div>
        </Reveal>
        <ul className="mt-10 border-t border-ink/80" id="built-title" aria-label="Built for">
          {AUDIENCES.map(([h, b], i) => (
            <Reveal as="li" key={h} delay={i * 0.04} className="group grid grid-cols-[minmax(0,1fr)] items-baseline gap-2 border-b border-line py-6 transition-colors hover:bg-ink/[0.025] md:grid-cols-12 md:gap-8">
              <span className="text-[clamp(1.5rem,3.4vw,3rem)] leading-none font-medium tracking-[-0.045em] text-ink md:col-span-7">{h}</span>
              <span className="text-[14px] leading-relaxed text-ink-3 md:col-span-5">{b}</span>
            </Reveal>
          ))}
        </ul>

        <dl className="mt-20 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          <Metric label="Live assets" value={ev.assets.length} state={ev.assets.length ? "ok" : ev.error ? "unknown" : "loading"} source="Robinhood" />
          <Metric label="Chain" value="RH CHAIN" state="ok" source="ID 4663" size="md" />
          <Metric label="API status" value={api ? healthWord(api.health) : null} state={api ? "ok" : "loading"} source="COMMS" size="md" />
          <Metric
            label="Last sync"
            value={sync && now ? `${formatTimestamp(new Date(sync).toISOString()).split(", ")[1]} UTC` : null}
            state={sync ? "ok" : registry.error ? "unknown" : "loading"}
            source="Asset registry"
            size="md"
          />
        </dl>
      </div>
    </section>
  );
}
