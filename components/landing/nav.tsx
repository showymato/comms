"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCommandPalette } from "@/components/dashboard/command-palette";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#engine", label: "Engine" },
  { href: "#check", label: "Live check" },
  { href: "#policy", label: "Policies" },
  { href: "#developers", label: "Developers" },
  { href: "#architecture", label: "Architecture" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
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
        <nav aria-label="Primary" className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 lg:px-10">
          <Link href="/" aria-label="COMMS home" className="rounded-md">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded-md px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
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
