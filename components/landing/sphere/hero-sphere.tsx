"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore, type Ref } from "react";
import { useAccount } from "wagmi";
import { HealthTag, ModeBadge } from "@/components/live/badges";
import { StatusGlyph } from "@/components/ui/status";
import { useLive, useSignal, useWatchSymbol, useNowMs } from "@/hooks/use-live";
import { useReducedMotion } from "@/hooks/use-motion";
import { overallHealth, useSystemStatus } from "@/hooks/use-system-status";
import { DATA_MODE } from "@/lib/data/config";
import { liveManager, type Signal } from "@/lib/data/live-manager";
import { formatAgo, shortAddress } from "@/lib/format";
import { STATUS } from "@/lib/status";
import { RH_CHAIN_ID } from "@/lib/wallet/chain";
import { cn } from "@/lib/utils";
import { getIntroPhase, useHeroRevealed, useIntroPhase } from "../hero-intro";
import { SphereEngine, type CardPos, type EngineStats, type SystemId } from "./engine";
import { TokenCard } from "./token-card";
import { useSphereData, type SphereItem } from "./use-sphere-data";

export interface HeroSphereHandle {
  /** CTA hover: the network gets a little more active */
  explore(on: boolean): void;
  /** CTA hover: run the evaluation path once, then settle back to idle */
  evaluate(): void;
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const noopSubscribe = () => () => {};

/**
 * Top-left: `● LIVE` over the chain name. LIVE only when every source is fresh (otherwise LAST KNOWN / STALE / DEGRADED / OFFLINE);
 * the dot breathes only while the state is actually LIVE. Demo builds say so instead.
 */
function LiveCorner({ on }: { on: boolean }) {
  const rows = useSystemStatus();
  const health = overallHealth(rows);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-start gap-1">
      {DATA_MODE === "demo" ? <ModeBadge /> : <HealthTag health={health} className={cn("!text-[11px] !tracking-[0.12em]", health === "LIVE" && "[&>span:first-child]:animate-breathe")} />}
      <span className="text-ink-3">Robinhood Chain · {RH_CHAIN_ID}</span>
    </motion.div>
  );
}

/** Bottom-right: the latest block actually read from the chain. */
function BlockCorner() {
  const chain = useLive((s) => s.chain);
  const now = useNowMs(1000);
  if (DATA_MODE === "demo") return null;
  const d = chain.data;
  return (
    <span className="tabular" title={d ? `Read from Robinhood Chain ${chain.fetchedAt ? formatAgo((now - chain.fetchedAt) / 1000) : ""}` : "No block read yet"}>
      BLOCK {d ? `#${d.block.toLocaleString("en-US")}` : "—"}
    </span>
  );
}

/** While the registry is really being fetched: two honest status lines with tiny indicators, no skeletons. */
function Microstates() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep(1), 900);
    return () => clearTimeout(t);
  }, []);
  const lines = ["Resolving asset", "Reading live state"];
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-9 flex flex-col items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase">
      {lines.map((l, i) => (
        <span key={l} className={cn("flex items-center gap-2 transition-opacity duration-500", i <= step ? "text-ink-2 opacity-100" : "opacity-0")}>
          <span aria-hidden className={cn("size-1 rounded-full", i < step ? "bg-eligible" : "animate-pulse bg-signal")} />
          {l}
        </span>
      ))}
    </div>
  );
}

function Unavailable({ error }: { error: string | null }) {
  const registry = useLive((s) => s.registry);
  const now = useNowMs(1000);
  return (
    <div role="alert" className="absolute inset-0 z-10 grid place-items-center">
      <div className="w-[min(320px,86%)] rounded-lg border border-line-2 bg-surface p-4 text-left shadow-float">
        <div className="font-mono text-[11px] tracking-[0.08em] text-conditional">DATA TEMPORARILY UNAVAILABLE</div>
        <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Source</dt>
            <dd className="text-ink">Robinhood API</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Last successful update</dt>
            <dd className="text-ink">{registry.lastOkAt ? formatAgo((now - registry.lastOkAt) / 1000) : "never"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Timestamp</dt>
            <dd className="text-ink">{now ? new Date(now).toISOString().slice(11, 19) + " UTC" : "—"}</dd>
          </div>
        </dl>
        {error ? <p className="mt-2 line-clamp-2 text-[11.5px] text-ink-3">{error}</p> : null}
        <button type="button" onClick={() => liveManager().refresh("registry")} className="mt-3 h-8 rounded-md bg-ink px-3 font-mono text-[11px] tracking-[0.08em] text-on-ink uppercase hover:bg-ink/85">
          Retry
        </button>
      </div>
    </div>
  );
}

/** Appears for ~1.4 s the first time the sphere is touched. It says LIVE only while every source is fresh. */
function WakeLabel({ on }: { on: boolean }) {
  const rows = useSystemStatus();
  const health = overallHealth(rows);
  const word = DATA_MODE === "demo" ? "DEMO" : health === "LIVE" ? "LIVE" : health.replace("_", " ");
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: on ? 1 : 0, y: on ? 0 : 4 }}
      transition={{ duration: on ? 0.35 : 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
      style={{ top: "calc(50% + 44px)" }}
    >
      <span className="rounded-xs bg-[#080c10]/75 px-2 py-1 font-mono text-[9.5px] tracking-[0.2em] text-on-ink/90 uppercase">{word} collateral state</span>
    </motion.div>
  );
}

export function HeroSphere({ ref }: { ref?: Ref<HeroSphereHandle> }) {
  const data = useSphereData();
  const reduce = useReducedMotion();
  const docked = useMedia("(max-width: 639px)");
  const compact = useMedia("(max-width: 639px), (pointer: coarse)");
  const debug = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).get("debug") === "1",
    () => false,
  );
  const registryAt = useLive((s) => s.registry.fetchedAt);
  const nowMs = useNowMs(1000);
  const lastUpdate = registryAt && nowMs ? (nowMs - registryAt) / 1000 : null;
  const { address, isConnected, chainId } = useAccount();
  const walletState = isConnected && address ? (chainId === RH_CHAIN_ID ? "ok" : "wrong") : "none";

  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<SphereEngine | null>(null);
  const lastEval = useRef(0);

  // nothing is selected until the visitor touches a node (or a chip); the card exists only for a selection
  const [sel, setSel] = useState<string | null>(null);
  const [ptrHover, setPtrHover] = useState<string | null>(null);
  const [chipHover, setChipHover] = useState<string | null>(null);
  const [evalKey, setEvalKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [awake, setAwake] = useState(false);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const revealed = useHeroRevealed();

  const { items, tokens, system, loaded, total, error } = data;
  const selectedId = sel !== null && items.some((i) => i.id === sel) ? sel : null;
  const hoverId = ptrHover ?? chipHover;
  const shown = items.find((i) => i.id === selectedId) ?? null;
  // keep the last card mounted while it fades out
  const [held, setHeld] = useState<SphereItem | null>(null);
  if (shown && shown !== held) setHeld(shown);
  const card = shown ?? held;
  const cardOn = reduce || ready;

  const itemsRef = useRef(items);
  const selRef = useRef(selectedId);
  useEffect(() => {
    itemsRef.current = items;
    selRef.current = selectedId;
  });

  // the entrance: the engine builds the sphere while the loader dissolves (begin() below); once the hero copy is revealed
  // the live indicator and the rest of the sphere UI follow
  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(t);
  }, [revealed]);

  const select = useCallback((id: string) => {
    setSel(id);
    setEvalKey((k) => k + 1);
    engineRef.current?.setSelected(id, true);
  }, []);
  const deselect = useCallback(() => {
    setSel(null);
    engineRef.current?.setSelected(null);
  }, []);

  // Escape closes the card from anywhere on the page while one is open
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") deselect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deselect]);

  // ── engine lifecycle ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    let size = { w: 1, h: 1 };
    let cardSize = { w: 292, h: 300 };
    const cur = { x: 0, y: 0, init: false, t: performance.now() };
    const ro = new ResizeObserver(() => {
      const r = stage.getBoundingClientRect();
      size = { w: r.width, h: r.height };
      const c = cardRef.current;
      if (c) cardSize = { w: c.offsetWidth || 292, h: c.offsetHeight || 300 };
    });
    ro.observe(stage);
    if (cardRef.current) ro.observe(cardRef.current);

    const place = (p: CardPos | null) => {
      const el = cardRef.current;
      const lead = leaderRef.current;
      if (!el) return;
      if (!p) {
        // fades out where it is (CSS transition); the next card starts at its own node instead of sliding from this one
        el.style.opacity = "0";
        if (lead) lead.style.opacity = "0";
        cur.init = false;
        return;
      }
      const now = performance.now();
      const k = reduce || !cur.init ? 1 : 1 - Math.exp(-(now - cur.t) / 110);
      cur.t = now;
      // the node label sits to the right of the node, so the card clears it on that side
      let tx = p.x + p.r + 58;
      const flip = tx + cardSize.w > size.w - 8;
      if (flip) tx = p.x - p.r - 20 - cardSize.w;
      tx = Math.max(8, Math.min(size.w - cardSize.w - 8, tx));
      const ty = Math.max(8, Math.min(size.h - cardSize.h - 8, p.y - 30));
      cur.x = cur.init ? cur.x + (tx - cur.x) * k : tx;
      cur.y = cur.init ? cur.y + (ty - cur.y) * k : ty;
      cur.init = true;
      el.style.transform = `translate3d(${cur.x.toFixed(1)}px,${cur.y.toFixed(1)}px,0)`;
      el.style.opacity = p.front ? "1" : "0.6";
      if (lead) {
        const edge = flip ? cur.x + cardSize.w : cur.x;
        const from = flip ? edge : p.x + p.r + 3;
        const to = flip ? p.x - p.r - 3 : edge;
        const w = Math.abs(to - from);
        lead.style.opacity = w > 4 && p.y >= cur.y && p.y <= cur.y + cardSize.h ? "1" : "0";
        lead.style.width = `${w.toFixed(1)}px`;
        lead.style.transform = `translate3d(${Math.min(from, to).toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
      }
    };

    const eng = new SphereEngine(
      canvas,
      { compact, reduced: reduce, hold: getIntroPhase() === "loader" },
      {
        onHover: setPtrHover,
        onSelect: (id) => select(id),
        onDeselect: () => deselect(),
        onCard: docked ? undefined : place,
        onStats: debug ? setStats : undefined,
        onWake: () => {
          setAwake(true);
          setTimeout(() => setAwake(false), 1500);
        },
      },
    );
    engineRef.current = eng;
    eng.mount();
    if (getIntroPhase() !== "loader") eng.begin();
    if (debug) (window as unknown as { __sphere?: SphereEngine }).__sphere = eng;
    return () => {
      ro.disconnect();
      eng.destroy();
      engineRef.current = null;
    };
    // the engine is rebuilt only when its capabilities change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, docked, debug]);

  // the loader releases the sphere: it starts forming behind the dissolving scrim
  const introPhase = useIntroPhase();
  useEffect(() => {
    if (introPhase !== "loader") engineRef.current?.begin();
  }, [introPhase]);

  useEffect(() => engineRef.current?.setReduced(reduce), [reduce, compact, docked, debug]);
  useEffect(() => engineRef.current?.setData(tokens, system), [tokens, system, compact, docked, debug]);
  useEffect(() => {
    engineRef.current?.setExternalHover(chipHover);
  }, [chipHover, compact, docked, debug]);
  useEffect(() => {
    engineRef.current?.setSelected(selectedId, true);
  }, [selectedId, tokens, compact, docked, debug]);
  useEffect(() => {
    engineRef.current?.setCardTarget(cardOn ? selectedId : null);
  }, [selectedId, cardOn, compact, docked, debug]);
  useEffect(() => {
    engineRef.current?.setWallet(walletState);
  }, [walletState, compact, docked, debug]);

  // real quotes for what the visitor is looking at (a hovered node is prefetched, so its card opens with data)
  const selSymbol = items.find((i) => i.id === selectedId)?.asset.symbol ?? null;
  const hoverSymbol = items.find((i) => i.id === hoverId)?.asset.symbol ?? null;
  const [watchHover, setWatchHover] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setWatchHover(hoverSymbol), 160);
    return () => clearTimeout(t);
  }, [hoverSymbol]);
  useWatchSymbol(selSymbol);
  useWatchSymbol(watchHover);

  // real system events drive the network: a state change re-runs evaluation, a request pulses its source
  const onSignal = useCallback((s: Signal) => {
    const eng = engineRef.current;
    if (!eng) return;
    const idOf = (sym: string) => itemsRef.current.find((i) => i.asset.symbol === sym)?.id;
    if (s.type === "response" && s.ok) {
      const src: SystemId | null = s.target.includes("price") ? "prices" : s.target.includes("chain") ? "chain" : s.target.includes("asset") || s.target.includes("registry") ? "registry" : null;
      if (src) eng.flow(src);
    } else if (s.type === "eligibility" || s.type === "state") {
      const id = idOf(s.symbol);
      if (id) {
        eng.recalculate(id);
        if (id === selRef.current) setEvalKey((k) => k + 1);
      }
    } else if (s.type === "price") {
      const id = idOf(s.symbol);
      if (id) eng.pulse(id);
    }
  }, []);
  useSignal(onSignal);

  // scroll: the sphere eases back and tilts as the page moves on; the pipeline nodes light in order
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.95)));
      engineRef.current?.setScroll(p);
      const w = wrapRef.current;
      if (w && !reduce) {
        w.style.transform = `translate3d(0,${(p * 30).toFixed(1)}px,0)`;
        w.style.opacity = String(1 - p * 0.3);
      }
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
  }, [reduce]);

  useImperativeHandle(
    ref,
    () => ({
      explore: (on) => engineRef.current?.setIntent(on ? "explore" : "idle"),
      evaluate: () => {
        const now = performance.now();
        if (now - lastEval.current < 2600) return;
        lastEval.current = now;
        engineRef.current?.setIntent("evaluate");
        setEvalKey((k) => k + 1);
      },
    }),
    [],
  );

  const onListKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const btns = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-token]"));
    const i = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      btns[(i + 1) % btns.length]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      btns[(i - 1 + btns.length) % btns.length]?.focus();
    }
  };

  return (
    <div className="relative">
      <div ref={wrapRef} className="will-change-transform">
        <div ref={stageRef} className="relative h-[380px] w-full sm:h-[520px] lg:h-[620px]">
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" style={{ touchAction: "pan-y" }} />

          {/* Web3 atmosphere: real chain / block / registry readouts, nothing decorative */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase">
            <div className="space-y-2">
              <LiveCorner on={cardOn} />
              {walletState !== "none" && address ? (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 text-ink">
                  <span className={cn("size-1.5 rounded-full", walletState === "ok" ? "bg-signal" : "bg-conditional")} />
                  {walletState === "ok" ? "Connected" : "Wrong network"} · <span className="normal-case">{shortAddress(address, 4, 3)}</span>
                  <span className="text-ink-4">· Read-only</span>
                </motion.div>
              ) : null}
            </div>
          </div>

          {/* first touch: the network wakes and names what it is showing — honest about its freshness */}
          <WakeLabel on={awake} />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between font-mono text-[10px] tracking-[0.1em] text-ink-3 uppercase">
            <span>{loaded ? `${total} tokens · ${tokens.length} shown` : "Registry —"}</span>
            <span className={cn("hidden transition-opacity duration-500 sm:block", selectedId || !loaded ? "opacity-0" : "opacity-100")}>Touch a node · drag to turn</span>
            <BlockCorner />
          </div>

          {!loaded ? (
            error ? (
              <Unavailable error={error} />
            ) : (
              <Microstates />
            )
          ) : null}

          {/* leader line + floating evidence card, both driven imperatively from the engine's projected node position */}
          {!docked ? (
            <>
              <span ref={leaderRef} aria-hidden className="pointer-events-none absolute top-0 left-0 z-10 h-px origin-left bg-signal/60 opacity-0" />
              <div
                ref={cardRef}
                data-sphere-ui
                aria-live="polite"
                className={cn("absolute top-0 left-0 z-20 opacity-0 transition-[opacity,visibility] duration-200 will-change-transform", shown ? "pointer-events-auto" : "pointer-events-none")}
                style={{ visibility: shown && cardOn ? "visible" : "hidden" }}
              >
                {card ? <TokenCard item={card} selected evalKey={evalKey} onClose={deselect} /> : null}
              </div>
            </>
          ) : null}
        </div>

        {docked && shown ? (
          <div aria-live="polite" className="mt-3">
            <TokenCard item={shown} selected evalKey={evalKey} onClose={deselect} docked />
          </div>
        ) : null}

        {/* keyboard / screen-reader / touch path — the sphere is an enhancement, this is the same information */}
        <div className={cn("mt-4 transition-opacity duration-700", cardOn ? "opacity-100" : "opacity-0")}>
          <div id="sphere-desc" className="sr-only">
            Interactive network of {tokens.length} Stock Tokens around the COMMS core. Choose a token to see its evidence and eligibility. Arrow keys move between tokens, Escape clears the selection.
          </div>
          <div role="group" aria-label="Stock Tokens" aria-describedby="sphere-desc" onKeyDown={onListKey} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {items.map((it) => {
              const on = it.id === selectedId;
              const st = STATUS[it.result.status];
              return (
                <button
                  key={it.id}
                  type="button"
                  data-token
                  aria-pressed={on}
                  onClick={() => (on ? deselect() : select(it.id))}
                  onMouseEnter={() => setChipHover(it.id)}
                  onMouseLeave={() => setChipHover((h) => (h === it.id ? null : h))}
                  onFocus={() => setChipHover(it.id)}
                  onBlur={() => setChipHover((h) => (h === it.id ? null : h))}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-2 rounded-xs border px-2.5 font-mono text-[11px] tracking-[0.06em] transition-[background-color,border-color,color,transform] duration-150 hover:-translate-y-px",
                    on ? "border-ink bg-ink text-on-ink" : "border-line-2 text-ink-2 hover:border-ink/50 hover:text-ink",
                  )}
                >
                  <span aria-hidden className={cn("size-1.5 rounded-full", st.dot)} />
                  {it.asset.symbol}
                  <span className="sr-only">{`, ${st.label}`}</span>
                </button>
              );
            })}
            {loaded && total > items.length ? (
              <Link href="/app/assets" className="inline-flex h-8 shrink-0 items-center rounded-xs px-2 font-mono text-[11px] tracking-[0.06em] text-ink-3 hover:text-ink">
                +{total - items.length} in registry →
              </Link>
            ) : null}
          </div>
          {/* fixed height: selecting a token must not push the hero copy around */}
          <div className="mt-2 h-4">
            {selectedId && shown ? (
              <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                <StatusGlyph status={shown.result.status} size={11} className={STATUS[shown.result.status].text} />
                <span className="sr-only">Selected asset status: </span>
                {shown.asset.symbol} · {shown.result.status}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {debug ? (
        <div className="pointer-events-none absolute top-8 left-0 z-30 rounded-md border border-line-2 bg-ink px-3 py-2 font-mono text-[10px] leading-relaxed text-on-ink">
          <div>FPS {stats?.fps ?? "—"} · {stats?.running ? "running" : "idle"}</div>
          <div>Assets {total} · Nodes {stats?.nodes ?? 0} · Links {stats?.links ?? 0} · Packets {stats?.packets ?? 0}</div>
          <div>Source {DATA_MODE === "demo" ? "demo dataset" : "Robinhood API + RH Chain RPC"} ({DATA_MODE}) · last update {lastUpdate === null ? "never" : formatAgo(lastUpdate)}</div>
          <div>Renderer canvas-2d · WebGL not used · compact {String(compact)} · reduced {String(reduce)}</div>
        </div>
      ) : null}
    </div>
  );
}
