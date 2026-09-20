"use client";

import { motion } from "motion/react";
import { Bell, Check, ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useCommandPalette } from "@/components/dashboard/command-palette";
import { Logo } from "@/components/ui/logo";
import { Popover } from "@/components/ui/popover";
import { DemoTag, Kbd } from "@/components/ui/primitives";
import { LiveDot, StatusGlyph } from "@/components/ui/status";
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
      className={cn("relative flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors", active ? "text-ink" : "text-ink-2 hover:bg-white/4 hover:text-ink")}
    >
      {active ? <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-white/[0.07] hairline" transition={{ type: "spring", stiffness: 520, damping: 40 }} /> : null}
      {active ? <motion.span layoutId="nav-bar" className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-cyan" transition={{ type: "spring", stiffness: 520, damping: 40 }} /> : null}
      <Icon size={16} className={cn("relative", active ? "text-cyan" : "")} aria-hidden />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function SystemStatus() {
  return (
    <div className="rounded-lg border border-line bg-white/2 p-3">
      <div className="label mb-2.5">System status</div>
      <dl className="space-y-2 text-[12px]">
        <div className="flex items-center justify-between">
          <dt className="text-ink-3">Network</dt>
          <dd className="flex items-center gap-1.5 font-mono text-ink-2">
            <LiveDot /> RH CHAIN
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-3">API</dt>
          <dd className="flex items-center gap-1.5 font-mono text-eligible">
            <LiveDot /> OPERATIONAL
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-base-1 lg:flex">
      <div className="flex h-14 items-center border-b border-line px-5">
        <Link href="/" aria-label="COMMS home">
          <Logo />
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
  return (
    <Popover
      label="Notifications"
      triggerClassName="relative grid size-9 place-items-center rounded-md text-ink-2 transition-colors hover:bg-white/6 hover:text-ink"
      trigger={
        <>
          <Bell size={16} />
          <span aria-hidden className="absolute top-2 right-2 size-1.5 rounded-full bg-cyan" />
        </>
      }
      panelClassName="w-[340px]"
    >
      {() => (
        <div>
          <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2">
            <span className="label !text-ink-2">Recent status changes</span>
            <DemoTag />
          </div>
          <ul>
            {items.map((e) => (
              <li key={e.id} className="rounded-md px-2.5 py-2 hover:bg-white/4">
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
          <Link href="/events" className="mt-1 block rounded-md px-2.5 py-2 text-[12.5px] text-cyan hover:bg-white/4">
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
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-white/6 lg:hidden">
        <Menu size={18} />
      </button>
      <Link href="/" aria-label="COMMS home" className="lg:hidden">
        <Logo size={22} />
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 max-w-md flex-1 items-center gap-2.5 rounded-md border border-line bg-white/3 px-3 text-left text-[13px] text-ink-3 transition-colors hover:border-line-2 lg:flex"
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
        <DemoTag className="hidden sm:inline-flex" />
        <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-white/6 lg:hidden">
          <Search size={16} />
        </button>

        <Popover
          label="Network"
          triggerClassName="hidden h-9 items-center gap-2 rounded-md border border-line px-2.5 font-mono text-[11.5px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink sm:flex"
          trigger={
            <>
              <LiveDot /> RH CHAIN <ChevronDown size={12} />
            </>
          }
          panelClassName="w-56"
        >
          {(close) => (
            <button type="button" onClick={close} className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] text-ink hover:bg-white/5">
              <span className="flex items-center gap-2 font-mono text-[12px]">
                <LiveDot /> RH Chain
              </span>
              <Check size={14} className="text-cyan" />
            </button>
          )}
        </Popover>

        <Notifications />

        <Popover
          label="Organization menu"
          triggerClassName="flex h-9 items-center gap-2 rounded-md pr-1.5 pl-1 transition-colors hover:bg-white/6"
          trigger={
            <>
              <span aria-hidden className="grid size-7 place-items-center rounded-md bg-linear-to-br from-cyan/30 to-iris/30 font-mono text-[11px] font-medium text-ink hairline">DP</span>
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-[12.5px] text-ink">Demo Protocol</span>
                <span className="block font-mono text-[10px] text-ink-3">Organization</span>
              </span>
            </>
          }
          panelClassName="w-60"
        >
          {(close) => (
            <ul>
              <li className="px-2.5 py-2">
                <div className="text-[13px] text-ink">Demo Protocol</div>
                <div className="font-mono text-[11px] text-ink-3">demo@protocol.example</div>
              </li>
              <li>
                <Link href="/settings" onClick={close} className="block rounded-md px-2.5 py-2 text-[13px] text-ink-2 hover:bg-white/5 hover:text-ink">
                  Settings
                </Link>
              </li>
              <li>
                <Link href="/" onClick={close} className="block rounded-md px-2.5 py-2 text-[13px] text-ink-2 hover:bg-white/5 hover:text-ink">
                  Back to website
                </Link>
              </li>
            </ul>
          )}
        </Popover>
      </div>
    </header>
  );
}

const BOTTOM = ["/overview", "/assets", "/policies", "/events"];

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
                className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-[15px]", isActive(pathname, n) ? "bg-white/[0.07] text-ink" : "text-ink-2")}
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
