"use client";

import { motion } from "motion/react";
import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCommandPalette } from "@/components/dashboard/command-palette";
import { Logo } from "@/components/ui/logo";
import { NetworkPill } from "@/components/site/site-nav";
import { WalletButton } from "@/components/wallet/connect-button";
import { Popover } from "@/components/ui/popover";
import { Kbd } from "@/components/ui/primitives";
import { HealthTag, ModeBadge } from "@/components/live/badges";
import { ChainBlock } from "@/components/live/status-panel";
import { EventTimeline } from "@/components/live/event-timeline";
import { overallHealth, useSystemStatus } from "@/hooks/use-system-status";
import { useLive } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { StatusGlyph } from "@/components/ui/status";
import { Drawer } from "@/components/ui/overlay";
import { formatClock } from "@/lib/format";
import { seedEvents } from "@/data/events";
import { STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { NAV, SDK_ITEM, isActive, type NavItem } from "./nav-items";

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors", active ? "text-ink" : "text-ink-2 hover:bg-ink/4 hover:text-ink")}
    >
      {active ? <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-ink/[0.07] hairline" transition={{ type: "spring", stiffness: 520, damping: 40 }} /> : null}
      {active ? <motion.span layoutId="nav-bar" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-cyan" transition={{ type: "spring", stiffness: 520, damping: 40 }} /> : null}
      <Icon size={16} className={cn("relative", active ? "text-cyan" : "")} aria-hidden />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function SystemStatus() {
  const rows = useSystemStatus();
  const overall = overallHealth(rows);
  return (
    <div className="rounded-lg border border-line bg-ink/2 p-3">
      <div className="label mb-2.5">System status</div>
      <dl className="space-y-2 text-[12px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-ink-3">Data</dt>
          <dd>
            <HealthTag health={overall} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-ink-3">Mode</dt>
          <dd className="font-mono text-[11px] text-ink-2">{DATA_MODE.toUpperCase()}</dd>
        </div>
        {DATA_MODE !== "demo" ? (
          <div className="pt-1">
            <ChainBlock className="flex-wrap" />
          </div>
        ) : null}
      </dl>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-base lg:flex">
      <div className="flex h-14 items-center border-b border-line px-5">
        <Link href="/" aria-label="COMMS home">
          <Logo tone="black" />
        </Link>
      </div>
      <nav aria-label="Application" className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((n) => (
          <SideLink key={n.href} item={n} active={isActive(pathname, n)} />
        ))}
      </nav>
      <div className="space-y-3 p-3">
        <SystemStatus />
      </div>
    </aside>
  );
}

function Notifications() {
  const items = seedEvents().slice(0, 4);
  const liveEvents = useLive((x) => x.events);
  return (
    <Popover
      label="Notifications"
      triggerClassName="relative grid size-9 place-items-center rounded-md text-ink-2 transition-colors hover:bg-ink/6 hover:text-ink"
      trigger={
        <>
          <Bell size={16} />
          {DATA_MODE === "demo" || liveEvents.length > 0 ? <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-cyan" /> : null}
        </>
      }
      panelClassName="w-[340px]"
    >
      {() => (
        <div>
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2">
            <span className="label !text-ink-2">{DATA_MODE === "demo" ? "Recent status changes" : "Observed events"}</span>
            <ModeBadge />
          </div>
          {DATA_MODE !== "demo" ? <EventTimeline limit={4} className="max-h-72 overflow-y-auto" /> : null}
          <ul className={DATA_MODE === "demo" ? undefined : "hidden"}>
            {items.map((e) => (
              <li key={e.id} className="rounded-md px-2.5 py-2 hover:bg-ink/4">
                <div className="flex items-center justify-between font-mono text-[11px] text-ink-3">
                  <span>{e.symbol}</span>
                  <span>{formatClock(e.timestamp)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px]">
                  <span className={STATUS[e.previous].text}>{e.previous}</span>
                  <span className="text-ink-4">→</span>
                  <span className={cn("flex items-center gap-1", STATUS[e.current].text)}>
                    <StatusGlyph status={e.current} size={11} />
                    {e.current}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] text-ink-4">{e.reason}</div>
              </li>
            ))}
          </ul>
          <Link href="/app/events" className="mt-1 block rounded-md px-2.5 py-2 text-[12.5px] text-cyan hover:bg-ink/4">
            Open event stream →
          </Link>
        </div>
      )}
    </Popover>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { setOpen } = useCommandPalette();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-base/80 px-4 backdrop-blur-xl lg:px-6">
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-ink/6 lg:hidden">
        <Menu size={18} />
      </button>
      <Link href="/" aria-label="COMMS home" className="lg:hidden">
        <Logo tone="black" size={22} />
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 max-w-md flex-1 items-center gap-2.5 rounded-md border border-line bg-ink/3 px-3 text-left text-[13px] text-ink-3 transition-colors hover:border-line-2 lg:flex"
        aria-label="Search assets, addresses, policies, events and docs"
      >
        <Search size={14} />
        <span className="flex-1">Search assets…</span>
        <span className="flex gap-0.5">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <ModeBadge className="hidden sm:inline-flex" />
        <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-ink/6 lg:hidden">
          <Search size={16} />
        </button>

        <NetworkPill className="hidden md:inline-flex" />

        <Notifications />

        <WalletButton />
      </div>
    </header>
  );
}

const BOTTOM = ["/app", "/app/assets", "/app/eligibility", "/app/events"];

function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => BOTTOM.includes(n.href));
  const moreActive = !items.some((i) => isActive(pathname, i));
  return (
    <nav aria-label="Application" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-base-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      {items.map((n) => {
        const a = isActive(pathname, n);
        const Icon = n.icon;
        return (
          <Link key={n.href} href={n.href} aria-current={a ? "page" : undefined} className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]", a ? "text-cyan" : "text-ink-3")}>
            <Icon size={18} aria-hidden />
            {n.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={cn("flex h-14 flex-col items-center justify-center gap-1 text-[10.5px]", moreActive ? "text-cyan" : "text-ink-3")}>
        <Menu size={18} aria-hidden />
        More
      </button>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const pathname = usePathname();
  const rest = [...NAV.filter((n) => !BOTTOM.includes(n.href)), SDK_ITEM];

  return (
    <div className="min-h-svh bg-base">
      <Sidebar />
      <div className="lg:pl-[232px]">
        <Topbar onMenu={() => setMenu(true)} />
        <main id="main" className="px-4 pt-6 pb-28 lg:px-8 lg:pt-8 lg:pb-16">
          {children}
        </main>
      </div>
      <BottomNav onMore={() => setMenu(true)} />

      <Drawer open={menu} onClose={() => setMenu(false)} title="Navigation" eyebrow="COMMS">
        <div className="space-y-4 p-3">
          <nav aria-label="All sections" className="space-y-0.5">
            {[...NAV.filter((n) => BOTTOM.includes(n.href)), ...rest].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenu(false)}
                aria-current={pathname === n.href ? "page" : undefined}
                className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-[15px]", isActive(pathname, n) ? "bg-ink/[0.07] text-ink" : "text-ink-2")}
              >
                <n.icon size={18} className={isActive(pathname, n) ? "text-cyan" : ""} aria-hidden />
                {n.label}
              </Link>
            ))}
          </nav>
          <SystemStatus />
        </div>
      </Drawer>
    </div>
  );
}
