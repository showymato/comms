"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { StatusBadge } from "@/components/ui/status";
import { Reveal } from "@/components/ui/motion-bits";
import { useEvaluated } from "@/hooks/use-evaluated";
import { tokenEquivalent } from "@/lib/live/evidence";
import { shortAddress } from "@/lib/format";

/** CASE / PROOF: the live registry itself. First rows by symbol; every value is the real one. */
export function RegistryPreview() {
  const ev = useEvaluated();
  const rows = useMemo(
    () =>
      ev.assets
        .map((a, i) => ({ a, r: ev.results[i] }))
        .filter(({ a }) => a.live?.lifecycle === "ACTIVE")
        .sort((x, y) => x.a.symbol.localeCompare(y.a.symbol))
        .slice(0, 8),
    [ev.assets, ev.results],
  );

  return (
    <section aria-labelledby="registry-title" className="relative border-t border-line py-28 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="label flex items-center gap-3">
              <span className="text-ink">05</span>
              <span aria-hidden className="h-px w-8 bg-line-2" />
              <span>Live registry</span>
            </div>
            <h2 id="registry-title" className="display display-md mt-8 max-w-[18ch] text-ink">
              Every Stock Token. Right now.
            </h2>
          </div>
          <Link href="/app/assets" className="inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.08em] text-ink uppercase underline decoration-ink/30 underline-offset-[6px] hover:decoration-ink">
            Open registry <ArrowUpRight size={14} />
          </Link>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">Live Stock Token registry sample</caption>
            <thead>
              <tr className="border-b border-ink/80 font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
                <th scope="col" className="py-3 pr-4 font-normal">Asset</th>
                <th scope="col" className="py-3 pr-4 font-normal">Contract</th>
                <th scope="col" className="py-3 pr-4 text-right font-normal">Token value · Robinhood</th>
                <th scope="col" className="py-3 pl-4 text-right font-normal">Eligibility</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 font-mono text-[12.5px] text-ink-3">
                    {ev.error ? "Registry unavailable — UNKNOWN." : "Reading the registry…"}
                  </td>
                </tr>
              ) : (
                rows.map(({ a, r }) => {
                  const p = a.live?.price;
                  const eq = p && a.live ? tokenEquivalent(p.mid, a.live.multiplier) : null;
                  return (
                    <tr key={a.address} className="group border-b border-line transition-colors hover:bg-ink/[0.03]">
                      <td className="py-4 pr-4">
                        <Link href={`/app/assets/${a.symbol}`} className="flex items-center gap-3">
                          {a.live?.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.live.logoUrl} alt="" width={28} height={28} loading="lazy" className="size-7 rounded-full bg-surface-2" />
                          ) : (
                            <span aria-hidden className="size-7 rounded-full bg-surface-2" />
                          )}
                          <span>
                            <span className="block text-[15px] tracking-[-0.02em] text-ink">{a.symbol}</span>
                            <span className="block max-w-[26ch] truncate text-[12px] text-ink-3">{a.name}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 pr-4 font-mono text-[12px] text-ink-2">{shortAddress(a.address, 8, 6)}</td>
                      <td className="tabular py-4 pr-4 text-right font-mono text-[13px] text-ink">{eq === null ? "UNKNOWN" : `$${eq.toFixed(2)}`}</td>
                      <td className="py-4 pl-4 text-right">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Reveal>
        <p className="mt-4 font-mono text-[10.5px] text-ink-3">Source: Robinhood Stock Token API · price = underlying mid × current multiplier · eligibility under policy DEFAULT</p>
      </div>
    </section>
  );
}
