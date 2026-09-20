"use client";

import { Reveal } from "@/components/ui/motion-bits";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLive } from "@/hooks/use-live";
import { DATA_MODE, POLL } from "@/lib/data/config";

/**
 * ARCHITECTURE: RPC → listener → state → recalculation → policy → event → UI.
 * Each stage reports what it is doing right now (from live state); packets travel the connectors with transforms only.
 */
export function Architecture() {
  const chain = useLive((s) => s.chain);
  const events = useLive((s) => s.events);
  const ev = useEvaluated();
  const demo = DATA_MODE === "demo";

  const stages: Array<{ name: string; live: string }> = [
    { name: "Chain RPC", live: chain.data ? `block #${chain.data.block.toLocaleString("en-US")}` : chain.error ? "UNKNOWN" : "connecting" },
    { name: "Event listener", live: demo ? "not connected" : `polling every ${POLL.chain / 1000}s` },
    { name: "State update", live: ev.assets.length ? `${ev.assets.length} assets` : "waiting" },
    { name: "Eligibility recalculation", live: ev.assets.length ? `${ev.assets.length} evaluated` : "waiting" },
    { name: "Policy engine", live: ev.policy.name },
    { name: "Event", live: `${events.length} observed this session` },
    { name: "Interface & API", live: "you are here" },
  ];

  return (
    <section aria-labelledby="arch-title" className="relative border-t border-line py-28 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <Reveal>
          <div className="label flex items-center gap-3">
            <span className="text-ink">08</span>
            <span aria-hidden className="h-px w-8 bg-line-2" />
            <span>Architecture</span>
          </div>
          <h2 id="arch-title" className="display display-md mt-8 max-w-[20ch] text-ink">
            State in. Decision out. Nothing in between is hidden.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <ol className="mt-16 grid grid-cols-[minmax(0,1fr)] gap-0 lg:grid-cols-7">
            {stages.map((s, i) => (
              <li key={s.name} className="relative flex gap-4 border-l border-line py-5 pl-5 lg:block lg:border-t lg:border-l-0 lg:py-0 lg:pt-6 lg:pl-0">
                <span aria-hidden className="absolute top-0 left-0 hidden size-2 -translate-y-1/2 rounded-full bg-ink lg:block" />
                <span aria-hidden className="absolute top-6 -left-[3.5px] size-[6px] rounded-full bg-ink lg:hidden" />
                {i < stages.length - 1 ? (
                  <span aria-hidden className="pointer-events-none absolute top-[-1.5px] left-2 hidden h-1 w-[calc(100%-8px)] overflow-hidden lg:block">
                    <span className="travel absolute inset-0" style={{ animationDelay: `${i * 0.35}s` }}>
                      <span className="absolute top-0 left-0 size-1 rounded-full bg-signal" />
                    </span>
                  </span>
                ) : null}
                <div className="lg:pr-4">
                  <div className="font-mono text-[10.5px] text-ink-3">{String(i + 1).padStart(2, "0")}</div>
                  <div className="mt-1 text-[15px] leading-tight tracking-[-0.02em] text-ink">{s.name}</div>
                  <div className="mt-2 font-mono text-[11px] leading-snug tracking-[0.04em] text-ink-3">{s.live}</div>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <p className="mt-10 max-w-2xl text-[14px] leading-relaxed text-ink-3">
          COMMS polls conservatively and caches on the server, so one visitor or a thousand cost the same number of upstream requests. When a WebSocket RPC is configured the listener switches from polling to subscriptions; events shown in the interface are only ever ones that were observed.
        </p>
      </div>
    </section>
  );
}
