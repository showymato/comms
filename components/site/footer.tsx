import Link from "next/link";
import { ModeBadge } from "@/components/live/badges";
import { Logo } from "@/components/ui/logo";
import { DATA_MODE } from "@/lib/data/config";

const COLS = [
  { h: "Products", links: [["Asset registry", "/app/assets"], ["Eligibility engine", "/app/eligibility"], ["Policy studio", "/app/policies"], ["Event stream", "/app/events"], ["Corporate actions", "/app/corporate-actions"]] },
  { h: "Developers", links: [["Overview", "/developers"], ["Quickstart", "/developers/quickstart"], ["API reference", "/developers/api"], ["SDK", "/developers/sdk"], ["Webhooks", "/app/webhooks"]] },
  { h: "Workspace", links: [["Overview", "/app"], ["Wallet workspace", "/app/workspace"], ["Settings", "/app/settings"]] },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-line bg-base">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-12 px-5 py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr] lg:px-10">
        <div>
          <Logo tone="black" />
          <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-ink-3">The collateral eligibility layer for tokenized stocks. Read-only: COMMS does not lend, borrow, custody funds, liquidate, trade or sign transactions.</p>
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
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-5 font-mono text-[11px] text-ink-3 lg:px-10">
          <span>© 2026 COMMS</span>
          <span className="flex items-center gap-3">
            <ModeBadge />
            {DATA_MODE === "demo" ? "DEMO ENVIRONMENT — every value shown is simulated." : "Data: Robinhood Stock Token API and Robinhood Chain."}
          </span>
        </div>
      </div>
    </footer>
  );
}
