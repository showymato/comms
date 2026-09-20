"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCommandPalette } from "@/components/dashboard/command-palette";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Kbd } from "@/components/ui/primitives";
import { Popover } from "@/components/ui/popover";
import { HealthTag } from "@/components/live/badges";
import { SystemStatusPanel } from "@/components/live/status-panel";
import { overallLabel } from "@/components/live/system-line";
import { overallHealth, useSystemStatus } from "@/hooks/use-system-status";
import { useLive, useNowMs } from "@/hooks/use-live";
import { useScrollDirection } from "@/hooks/use-motion";
import { DATA_MODE } from "@/lib/data/config";
import { HEALTH } from "@/lib/live/health";
import { formatAgo } from "@/lib/format";
import { EASE_CSS } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#engine", label: "Engine" },
  { href: "#check", label: "Live check" },
  { href: "#policy", label: "Policies" },
  { href: "#developers", label: "Developers" },
  { href: "#architecture", label: "Architecture" },
];

/** Small status pill: real health of every data dependency, with the time of the last successful sync. */
function StatusPill() {
  const rows = useSystemStatus();
  const overall = overallHealth(rows);
  const registry = useLive((x) => x.registry);
  const now = useNowMs(1000);
  const sync = registry.lastOkAt && now ? formatAgo((now - registry.lastOkAt) / 1000) : null;
  return (
    <Popover
      label="System status"
      triggerClassName="hidden h-8 items-center gap-2 rounded-md border border-line px-2.5 font-mono text-[10.5px] tracking-[0.08em] transition-colors hover:border-line-2 lg:flex"
      trigger={
        <>
          <HealthTag health={overall} dotOnly />
          <span className={HEALTH[overall].text}>{overallLabel(overall)}</span>
        </>
      }
      panelClassName="w-80 p-3"
    >
      {() => (
        <div>
          <SystemStatusPanel compact />
          {DATA_MODE !== "demo" ? <p className="mt-2 border-t border-line pt-2 font-mono text-[10.5px] text-ink-3">Last synchronization {sync ?? "—"}</p> : null}
        </div>
      )}
    </Popover>
  );
}

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const dir = useScrollDirection(120);
  // compress on scroll down, expand on scroll up; the logo never moves
  const compact = scrolled && dir === "down";

  useEffect(() => {
    const ids = ["engine", "check", "policy", "developers", "architecture"];
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  const { setOpen: openPalette } = useCommandPalette();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-[background-color,border-color,backdrop-filter] duration-300",
          scrolled || open ? "border-b border-line bg-base/75 backdrop-blur-xl" : "border-b border-transparent",
        )}
      >
        <nav
          aria-label="Primary"
          style={{ transitionTimingFunction: EASE_CSS }}
          className={cn("mx-auto flex max-w-[1320px] items-center justify-between px-5 transition-[height] duration-500 lg:px-10", compact ? "h-12" : "h-16")}
        >
          <Link href="/" aria-label="COMMS home" className="rounded-md">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active === l.href.slice(1) ? "location" : undefined}
                  className={cn("relative rounded-md px-3 py-1.5 text-[13px] transition-colors hover:text-ink", active === l.href.slice(1) ? "text-ink" : "text-ink-2")}
                >
                  {l.label}
                  {active === l.href.slice(1) ? <motion.span layoutId="landing-nav-active" className="absolute inset-x-3 -bottom-px h-px bg-cyan" transition={{ type: "spring", stiffness: 520, damping: 40 }} /> : null}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <StatusPill />
            <button
              type="button"
              onClick={() => openPalette(true)}
              className="hidden h-8 items-center gap-2 rounded-md border border-line bg-white/3 pr-1.5 pl-2.5 text-[12px] text-ink-3 transition-colors hover:border-line-2 hover:text-ink-2 sm:flex"
              aria-label="Open command palette"
            >
              <Search size={13} />
              Search
              <span className="flex gap-0.5">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <Button href="/overview" variant="primary" size="sm" className="hidden sm:inline-flex">
              Open app
            </Button>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-white/6 md:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden md:hidden"
            >
              <ul className="flex flex-col gap-1 px-5 pt-1 pb-5">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 text-[15px] text-ink-2 hover:bg-white/5 hover:text-ink">
                      {l.label}
                    </a>
                  </li>
                ))}
                <li className="pt-2">
                  <Button href="/overview" variant="primary" className="w-full">
                    Open app
                  </Button>
                </li>
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
