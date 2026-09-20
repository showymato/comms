import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = { title: "Overview" };

const CARDS: Array<[string, string, string]> = [
  ["Quickstart", "/developers/quickstart", "Your first eligibility check in three requests."],
  ["API reference", "/developers/api", "Every endpoint, with a playground that sends real requests."],
  ["SDK", "/developers/sdk", "@comms/eligibility — typed results, custom policies, evidence."],
];

export default function DevelopersPage() {
  return (
    <div>
      <div className="label flex items-center gap-3">
        <span className="text-ink">COMMS</span>
        <span aria-hidden className="h-px w-8 bg-line-2" />
        <span>Developers</span>
      </div>
      <h1 className="display display-lg mt-8 max-w-[14ch] text-ink uppercase">Build with certainty.</h1>
      <p className="mt-8 max-w-xl text-[clamp(1.05rem,1.6vw,1.3rem)] leading-[1.45] tracking-[-0.015em] text-ink-2">
        One read-only API answers a single question: can this Stock Token be collateral right now — and what is the evidence? Four outcomes to handle, every reason included, and UNKNOWN when the evidence is missing.
      </p>

      <ul className="mt-14 border-t border-ink/80">
        {CARDS.map(([h, href, b]) => (
          <li key={h}>
            <Link href={href} className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-6 border-b border-line py-7 transition-[padding,background-color] duration-300 hover:bg-ink/[0.025] hover:py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <span className="text-[clamp(1.6rem,3vw,2.6rem)] leading-none font-medium tracking-[-0.045em] text-ink">{h}</span>
              <span className="hidden text-[14px] text-ink-3 md:block">{b}</span>
              <ArrowUpRight size={20} className="text-ink-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <dl className="mt-16 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {[
          ["Read-only", "COMMS never lends, borrows, custodies, liquidates, trades or signs transactions."],
          ["Deterministic", "The same state and policy always produce the same answer. The engine is a pure function."],
          ["Evidence-backed", "Each check reports its source, block and timestamp where they exist. No evidence, no pass."],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="label !text-ink">{k}</dt>
            <dd className="mt-2 text-[13.5px] leading-relaxed text-ink-3">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
