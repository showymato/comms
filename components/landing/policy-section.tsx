import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/ui/motion-bits";
import { POLICIES } from "@/data/policies";
import { formatUsd } from "@/lib/format";

const P = POLICIES[0];

/** The policy is configuration, not data: these are the built-in DEFAULT thresholds. */
export function PolicySection() {
  const rows: Array<[string, string]> = [
    ["Minimum liquidity", formatUsd(P.minLiquidityUsd)],
    ["Oracle", P.oracleRequired ? "Required" : "Optional"],
    ["Transfer", P.transferRequired ? "Required" : "Optional"],
    ["Redemption", P.redemptionRequired ? "Required" : "Optional"],
  ];
  return (
    <section aria-labelledby="policy-title" className="relative border-t border-line py-28 lg:py-40">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-16 px-5 lg:grid-cols-12 lg:px-10">
        <Reveal className="lg:col-span-5">
          <div className="label flex items-center gap-3">
            <span className="text-ink">06</span>
            <span aria-hidden className="h-px w-8 bg-line-2" />
            <span>Policy</span>
          </div>
          <h2 id="policy-title" className="display display-md mt-8 max-w-[14ch] text-ink">
            Your rules. Their evidence.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-[1.6] text-ink-2">A policy decides which checks are decisive. Edit it, test it against a real asset, and watch the decision change — the engine is deterministic, so the same state and policy always give the same answer.</p>
          <Link href="/app/policies" className="mt-8 inline-flex items-center gap-1.5 font-mono text-[12px] tracking-[0.08em] text-ink uppercase underline decoration-ink/30 underline-offset-[6px] hover:decoration-ink">
            Open policy studio <ArrowUpRight size={14} />
          </Link>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="label mb-2">Policy · {P.name}</div>
          <dl className="border-t border-ink/80">
            {rows.map(([k, v]) => (
              <div key={k} className="group flex items-baseline justify-between gap-6 border-b border-line py-5 transition-colors hover:bg-ink/[0.025]">
                <dt className="text-[15px] text-ink-2">{k}</dt>
                <dd className="text-[clamp(1.6rem,3.2vw,2.75rem)] leading-none font-medium tracking-[-0.045em] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
