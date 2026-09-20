"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Boxes,
  BookOpen,
  CornerDownLeft,
  FileCode2,
  History,
  LayoutGrid,
  ListChecks,
  Radio,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Webhook,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Asset, EventType } from "@/types";
import { policyService } from "@/lib/services";
import { useAssets } from "@/hooks/use-live";
import { useStore } from "@/hooks/use-store";
import { useDialog, useMounted } from "@/hooks/use-utils";
import { shortAddress } from "@/lib/format";
import { API_SPEC } from "@/data/api-spec";
import { Kbd } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface PaletteCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const Ctx = createContext<PaletteCtx>({ open: false, setOpen: () => {} });
export const useCommandPalette = () => useContext(Ctx);

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
  icon: ReactNode;
  keywords: string;
}

const PAGES: Item[] = [
  { id: "p-home", group: "Navigate", label: "Home", href: "/", icon: <LayoutGrid size={15} />, keywords: "landing marketing" },
  { id: "p-overview", group: "Navigate", label: "Overview", href: "/app", icon: <LayoutGrid size={15} />, keywords: "dashboard" },
  { id: "p-assets", group: "Navigate", label: "Assets", href: "/app/assets", icon: <Boxes size={15} />, keywords: "registry explorer tokens" },
  { id: "p-elig", group: "Navigate", label: "Eligibility check", href: "/app/eligibility", icon: <ShieldCheck size={15} />, keywords: "check decision" },
  { id: "p-pol", group: "Navigate", label: "Policies", href: "/app/policies", icon: <SlidersHorizontal size={15} />, keywords: "rules simulator" },
  { id: "p-ev", group: "Navigate", label: "Events", href: "/app/events", icon: <Radio size={15} />, keywords: "stream feed" },
  { id: "p-wh", group: "Navigate", label: "Webhooks", href: "/app/webhooks", icon: <Webhook size={15} />, keywords: "endpoints deliveries" },
  { id: "p-api", group: "Navigate", label: "API reference", href: "/developers/api", icon: <BookOpen size={15} />, keywords: "docs rest endpoints" },
  { id: "p-sdk", group: "Navigate", label: "SDK", href: "/developers/sdk", icon: <FileCode2 size={15} />, keywords: "javascript typescript python" },
];

const EVENT_TYPES: EventType[] = ["ELIGIBILITY_CHANGED", "ASSET_PAUSED", "ORACLE_UNAVAILABLE", "TRANSFER_RESTRICTED", "ASSET_REDEEMED", "ASSET_REACTIVATED"];

function score(item: Item, q: string): number {
  if (!q) return 1;
  const l = item.label.toLowerCase();
  const hay = `${l} ${item.hint?.toLowerCase() ?? ""} ${item.keywords}`;
  if (l === q) return 100;
  if (l.startsWith(q)) return 80;
  if (l.includes(q)) return 60;
  if (hay.includes(q)) return 30;
  return 0;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Palette open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  );
}

function Palette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mounted = useMounted();
  const router = useRouter();
  const listId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const { assets } = useAssets();
  const policies = useStore(policyService.state);
  useDialog(open, onClose, panelRef);

  const items = useMemo<Item[]>(() => {
    const query = q.trim().toLowerCase();
    const out: Item[] = [];

    const matches = assets
      .map((a) => ({
        a,
        s: Math.max(
          a.symbol.toLowerCase() === query ? 100 : a.symbol.toLowerCase().startsWith(query) ? 80 : 0,
          a.name.toLowerCase().includes(query) ? 60 : 0,
          a.address.toLowerCase().includes(query) ? 40 : 0,
        ),
      }))
      .filter((m) => (query ? m.s > 0 : true))
      .sort((x, y) => y.s - x.s);

    if (query && matches.length > 0) {
      const top = matches[0].a;
      const base = `/app/assets/${top.address}`;
      const g = `${top.symbol}`;
      out.push(
        { id: `a-${top.symbol}`, group: g, label: top.name, hint: shortAddress(top.address), href: base, icon: <Boxes size={15} />, keywords: "" },
        { id: `a-${top.symbol}-e`, group: g, label: `${top.symbol} · Eligibility`, hint: "Decision & checks", href: base, icon: <ShieldCheck size={15} />, keywords: "" },
        { id: `a-${top.symbol}-h`, group: g, label: `${top.symbol} · History`, hint: "Status timeline", href: `${base}#history`, icon: <History size={15} />, keywords: "" },
        { id: `a-${top.symbol}-p`, group: g, label: `${top.symbol} · Policies`, hint: "Test in simulator", href: `/policies?asset=${top.address}#simulator`, icon: <SlidersHorizontal size={15} />, keywords: "" },
        { id: `a-${top.symbol}-v`, group: g, label: `${top.symbol} · Events`, hint: "Event stream", href: `/events?asset=${top.symbol}`, icon: <Radio size={15} />, keywords: "" },
      );
      matches.slice(1, 5).forEach(({ a }) =>
        out.push({ id: `a-${a.symbol}`, group: "Assets", label: a.name, hint: `${a.symbol} · ${shortAddress(a.address)}`, href: `/app/assets/${a.address}`, icon: <Boxes size={15} />, keywords: "" }),
      );
    } else if (!query) {
      matches.slice(0, 4).forEach(({ a }) =>
        out.push({ id: `a-${a.symbol}`, group: "Assets", label: a.name, hint: `${a.symbol} · ${shortAddress(a.address)}`, href: `/app/assets/${a.address}`, icon: <Boxes size={15} />, keywords: "" }),
      );
    }

    const pol: Item[] = policies.map((p) => ({ id: `pol-${p.id}`, group: "Policies", label: p.name, hint: `Min liquidity $${p.minLiquidityUsd.toLocaleString("en-US")}`, href: `/policies?policy=${p.id}`, icon: <SlidersHorizontal size={15} />, keywords: "policy" }));
    const ev: Item[] = EVENT_TYPES.map((t) => ({ id: `ev-${t}`, group: "Events", label: t, hint: "Filter event stream", href: `/events?type=${t}`, icon: <Zap size={15} />, keywords: "event" }));
    const docs: Item[] = API_SPEC.map((e) => ({ id: `doc-${e.id}`, group: "API docs", label: `${e.method} ${e.path}`, hint: e.summary, href: `/developers/api#${e.id}`, icon: <ListChecks size={15} />, keywords: "api docs endpoint" }));

    const rest = [...PAGES, ...pol, ...ev, ...docs]
      .map((i) => ({ i, s: score(i, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.i);
    const limit = query ? 8 : 12;
    return [...out, ...rest.slice(0, limit)];
  }, [q, assets, policies]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setQ(""); setActive(0); }
  }, [open]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    panelRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!mounted) return null;

  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-base/75 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.97, y: -8, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, y: -4, filter: "blur(4px)" }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[600px] overflow-hidden rounded-xl border border-line-2 bg-base-2 shadow-float outline-none"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={16} className="text-ink-3" aria-hidden />
              <input
                ref={inputRef}
                data-autofocus
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={items[active] ? `${listId}-${active}` : undefined}
                aria-label="Search assets, addresses, policies, events and API docs"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(items.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(items[active]);
                  }
                }}
                placeholder="Search assets, addresses, policies, events, docs…"
                className="h-13 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
                autoComplete="off"
                spellCheck={false}
              />
              <Kbd>esc</Kbd>
            </div>

            <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(58vh,440px)] overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-ink-3">
                  No results for <span className="font-mono text-ink-2">“{q}”</span>
                </p>
              ) : null}
              {items.map((item, i) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                return (
                  <div key={item.id}>
                    {header ? <div className="label px-3 pt-3 pb-1.5">{header}</div> : null}
                    <div
                      id={`${listId}-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                        i === active ? "bg-ink/7 text-ink" : "text-ink-2",
                      )}
                    >
                      <span className={cn("grid size-6 place-items-center rounded-sm", i === active ? "text-cyan" : "text-ink-3")}>{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint ? <span className="hidden max-w-[45%] truncate font-mono text-[11px] text-ink-3 sm:block">{item.hint}</span> : null}
                      {i === active ? <CornerDownLeft size={13} className="text-ink-3" aria-hidden /> : <ArrowUpRight size={13} className="opacity-0" aria-hidden />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-3">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> open</span>
              <span className="ml-auto font-mono">COMMS</span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
