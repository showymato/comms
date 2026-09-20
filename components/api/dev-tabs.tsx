"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DevTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Developer portal" className="mb-8 flex gap-1 border-b border-line">
      {[
        ["/api-reference", "API reference"],
        ["/sdk", "SDK"],
        ["/webhooks", "Webhooks"],
      ].map(([href, label]) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13.5px] transition-colors", pathname === href ? "border-cyan text-ink" : "border-transparent text-ink-3 hover:text-ink-2")}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
