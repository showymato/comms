"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV: Array<{ group: string; items: Array<[string, string]> }> = [
  { group: "Start", items: [["Overview", "/developers"], ["Quickstart", "/developers/quickstart"]] },
  {
    group: "API",
    items: [
      ["Authentication", "/developers/api#authentication"],
      ["Eligibility API", "/developers/api#eligibility"],
      ["Assets", "/developers/api#assets"],
      ["Policies", "/developers/api#policies"],
      ["Events", "/developers/api#events"],
      ["Webhooks", "/developers/api#webhooks"],
    ],
  },
  { group: "Libraries", items: [["SDK", "/developers/sdk"], ["Examples", "/developers/sdk#examples"]] },
];

export function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = (href: string) => (href.includes("#") ? false : pathname === href);
  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-x-12 px-5 pt-28 pb-24 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-10">
      <nav aria-label="Developer documentation" className="mb-10 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
        <div className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:block lg:overflow-visible lg:px-0">
          {NAV.map((g) => (
            <div key={g.group} className="flex shrink-0 items-center gap-1 lg:mb-7 lg:block">
              <div className="label hidden lg:mb-2 lg:block">{g.group}</div>
              <ul className="flex gap-1 lg:block">
                {g.items.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active(href) ? "page" : undefined}
                      className={cn("block rounded-md px-3 py-1.5 text-[13.5px] whitespace-nowrap transition-colors lg:px-0 lg:py-1", active(href) ? "text-ink lg:font-medium" : "text-ink-3 hover:text-ink")}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <main id="main" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
