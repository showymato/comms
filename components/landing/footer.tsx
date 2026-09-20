import { DATA_MODE } from "@/lib/data/config";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const COLS = [
  { h: "Product", links: [["Overview", "/overview"], ["Assets", "/assets"], ["Eligibility", "/eligibility"], ["Policies", "/policies"], ["Events", "/events"]] },
  { h: "Developers", links: [["API reference", "/api-reference"], ["SDK", "/sdk"], ["Webhooks", "/webhooks"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-base">
      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] max-w-[1320px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ink-3">
            The collateral eligibility layer for tokenized stocks. Read-only: COMMS does not lend, borrow, custody funds, liquidate, trade or sign transactions.
          </p>
        </div>
        {COLS.map((c) => (
          <nav key={c.h} aria-label={c.h}>
            <div className="label mb-4">{c.h}</div>
            <ul className="space-y-2.5">
              {c.links.map(([l, h]) => (
                <li key={h}>
                  <Link href={h} className="text-[14px] text-ink-2 transition-colors hover:text-ink">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 px-5 py-5 font-mono text-[11px] text-ink-4 lg:px-10">
          <span>© 2026 COMMS</span>
          <span>{DATA_MODE === "demo" ? "All assets, addresses and figures in this demo are simulated." : "Live data from Robinhood and Robinhood Chain. Sections marked DEMO DATA are illustrative."}</span>
        </div>
      </div>
    </footer>
  );
}
