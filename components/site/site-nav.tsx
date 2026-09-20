"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HealthTag } from "@/components/live/badges";
import { RollingText } from "@/components/live/rolling-text";
import { Logo } from "@/components/ui/logo";
import { Popover } from "@/components/ui/popover";
import { WalletButton } from "@/components/wallet/connect-button";
import { useLive } from "@/hooks/use-live";
import { useSliceHealthFor } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import { EASE_CSS } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  hint: string;
}

const PRODUCTS: Item[] = [
  { href: "/app/assets", label: "Asset registry", hint: "Every Stock Token, live" },
  { href: "/app/eligibility", label: "Eligibility engine", hint: "Run a check, read the evidence" },
  { href: "/app/policies", label: "Policy studio", hint: "Edit a policy, test it on a real asset" },
  { href: "/app/events", label: "Event stream", hint: "State changes as they happen" },
];

const RESOURCES: Item[] = [
  { href: "/developers/quickstart", label: "Quickstart", hint: "First check in five minutes" },
  { href: "/developers/api", label: "API reference", hint: "Endpoints, schemas, playground" },
  { href: "/developers/sdk", label: "SDK", hint: "@comms/eligibility" },
  { href: "/app/corporate-actions", label: "Corporate actions", hint: "Splits, dividends, mergers" },
];

/** NETWORK · RH CHAIN · block. Only a block that was actually read is ever shown. */
export function NetworkPill({ className }: { className?: string }) {
  const chain = useLive((s) => s.chain);
  const health = useSliceHealthFor("chain");
  if (DATA_MODE === "demo") return null;
  const block = chain.data?.block;
  return (
    <span className={cn("items-center gap-2 font-mono text-[11px] tracking-[0.06em] whitespace-nowrap", className)} title="Latest Robinhood Chain block, read from the RPC">
      <span className="text-ink-3">NETWORK</span>
      <span className="text-ink">RH CHAIN</span>
      <HealthTag health={health} dotOnly />
      <span className="tabular text-ink-2">{block === undefined ? "—" : <RollingText value={`#${block.toLocaleString("en-US")}`} />}</span>
    </span>
  );
}

function MenuLink({ label, items }: { label: string; items: Item[] }) {
  return (
    <Popover
      label={label}
      align="left"
      triggerClassName="flex h-9 items-center gap-1 rounded-md px-3 text-[13.5px] text-ink-2 transition-colors hover:text-ink"
      trigger={
        <>
          {label}
          <ChevronDown size={12} aria-hidden className="text-ink-3" />
        </>
      }
      panelClassName="w-[300px] p-1.5"
    >
      {(close) => (
        <ul>
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} onClick={close} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-ink/5">
                <span className="block text-[13.5px] text-ink">{i.label}</span>
                <span className="block text-[12px] text-ink-3">{i.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      setScrolled(window.scrollY > 16);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // close the mobile sheet on navigation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={cn("border-b transition-[background-color,border-color,backdrop-filter] duration-300", scrolled || open ? "border-line bg-base/80 backdrop-blur-xl" : "border-transparent")}>
        <nav
          aria-label="Primary"
          style={{ transitionTimingFunction: EASE_CSS }}
          className={cn("mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 transition-[height] duration-500 lg:px-10", scrolled ? "h-14" : "h-[72px]")}
        >
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="COMMS home" className="rounded-md">
              <Logo tone="black" />
            </Link>
            <div className="hidden items-center md:flex">
              <MenuLink label="Products" items={PRODUCTS} />
              <Link href="/#infrastructure" className="flex h-9 items-center rounded-md px-3 text-[13.5px] text-ink-2 transition-colors hover:text-ink">
                Infrastructure
              </Link>
              <Link href="/developers" className={cn("flex h-9 items-center rounded-md px-3 text-[13.5px] transition-colors hover:text-ink", pathname.startsWith("/developers") ? "text-ink" : "text-ink-2")}>
                Developers
              </Link>
              <MenuLink label="Resources" items={RESOURCES} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NetworkPill className="hidden lg:inline-flex" />
            <span aria-hidden className="hidden h-5 w-px bg-line-2 lg:block" />
            <WalletButton />
            <button
              type="button"
              className="grid size-9 place-items-center rounded-md text-ink hover:bg-ink/5 md:hidden"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open ? (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden md:hidden">
              <div className="max-h-[calc(100svh-72px)] overflow-y-auto px-5 pt-2 pb-8">
                {[
                  ["Products", PRODUCTS],
                  ["Resources", RESOURCES],
                ].map(([h, items]) => (
                  <div key={h as string} className="border-t border-line py-4">
                    <div className="label mb-2">{h as string}</div>
                    <ul>
                      {(items as Item[]).map((i) => (
                        <li key={i.href}>
                          <Link href={i.href} className="block py-2.5 text-[22px] tracking-[-0.03em] text-ink">
                            {i.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="border-t border-line py-4">
                  <Link href="/developers" className="block py-2.5 text-[22px] tracking-[-0.03em] text-ink">
                    Developers
                  </Link>
                  <Link href="/#infrastructure" className="block py-2.5 text-[22px] tracking-[-0.03em] text-ink">
                    Infrastructure
                  </Link>
                </div>
                <NetworkPill className="mt-2 inline-flex" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
