/**
 * LiveDataManager — the ONLY place the browser fetches data. Components subscribe to its state; none of them poll.
 *
 *  • Talks exclusively to COMMS' own /api routes (which cache and rate-limit upstream).
 *  • Stale-while-revalidate: a refresh never blanks a slice; a failed refresh keeps the last good value and marks it.
 *  • Request dedupe, AbortController, timeout, bounded retries and exponential backoff between polls (request.ts).
 *  • Polling pauses while the tab is hidden and stops when nothing is subscribed.
 *  • Detects real state changes by diffing successive real observations → EligibilityEventLive + signals for animation.
 *
 * Nothing in here generates data. Demo mode never starts a poller.
 */
import { ASSETS } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { evaluate } from "@/lib/engine";
import { buildLiveAsset, primaryDeployment, withDemoGaps, type ContractReads } from "@/lib/live/evidence";
import { createStore, type Store } from "@/lib/store";
import { DATA_MODE, FRESHNESS, POLL, freshnessOf, type Freshness } from "./config";
import { SwrCache } from "./cache";
import { errorMessage, HttpError, requestJson } from "./request";
import type { ApiEnvelope } from "@/lib/providers/serve";
import type { PausedSweep } from "@/lib/providers/server-data";
import type { ContractProbe } from "@/lib/chain/rh-client";
import type {
  Asset,
  ChainState,
  CorporateAction,
  EligibilityEventLive,
  EligibilityStatus,
  PriceSnapshot,
  ProviderHealth,
  ProviderStatus,
  RegistryAsset,
} from "@/types";

/* ───────────── state shape ───────────── */

export interface Slice<T> {
  data: T | null;
  /** epoch ms the upstream data was fetched (from the server envelope) */
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  latencyMs: number | null;
  /** epoch ms of the last request that succeeded */
  lastOkAt: number | null;
}

const empty = <T,>(): Slice<T> => ({ data: null, fetchedAt: null, loading: false, error: null, latencyMs: null, lastOkAt: null });

export interface ContractInfo {
  probe: ContractProbe | null;
  explorer: { status: "ok"; verified: boolean; name: string | null; compilerVersion: string | null; proxyType: string | null; implementation: string | null } | { status: "unavailable"; error: string } | null;
  fetchedAt: number | null;
  error: string | null;
  loading: boolean;
  latencyMs: number | null;
}

export interface OptionalProviders {
  loaded: boolean;
  error: string | null;
  providers: Array<ProviderStatus & { keyHint: string | null }>;
}

export interface LiveState {
  mode: typeof DATA_MODE;
  registry: Slice<RegistryAsset[]>;
  prices: Slice<Record<string, PriceSnapshot>>;
  chain: Slice<ChainState>;
  corporateActions: Slice<CorporateAction[]>;
  paused: Slice<PausedSweep>;
  /** per-symbol quotes for assets the user is looking at (fresher than the bulk set) */
  symbolPrices: Record<string, Slice<PriceSnapshot | null>>;
  contracts: Record<string, ContractInfo>;
  optional: OptionalProviders;
  /** derived: every registry asset with real evidence attached */
  assets: Asset[];
  /** epoch ms the derived assets were last recomputed */
  evaluatedAt: number | null;
  events: EligibilityEventLive[];
  /** true until the first registry + chain attempt has settled — drives the boot sequence */
  booting: boolean;
}

export type Signal =
  | { type: "request"; target: string }
  | { type: "response"; target: string; ok: boolean }
  | { type: "price"; symbol: string; from: number; to: number }
  | { type: "state"; symbol: string; detail: string }
  | { type: "eligibility"; symbol: string; from: EligibilityStatus | null; to: EligibilityStatus }
  | { type: "corporate"; symbol: string };

/* ───────────── envelope helpers ───────────── */

async function call<T>(url: string, signal: AbortSignal): Promise<{ data: T; fetchedAt: number; latencyMs: number; stale: boolean; error: string | null }> {
  try {
    const t = await requestJson<ApiEnvelope<T>>(url, { signal, timeoutMs: 12_000, retries: 1 });
    if (t.data.data === null) throw new Error(t.data.meta.error ?? "Empty response");
    return {
      data: t.data.data,
      fetchedAt: Date.parse(t.data.meta.fetchedAt),
      latencyMs: t.data.meta.latencyMs ?? t.latencyMs,
      stale: t.data.meta.stale,
      error: t.data.meta.error ?? null,
    };
  } catch (e) {
    if (e instanceof HttpError) {
      try {
        const body = JSON.parse(e.message) as ApiEnvelope<unknown>;
        if (body?.meta?.error) throw new Error(body.meta.error);
      } catch (inner) {
        if (inner instanceof Error && !(inner instanceof SyntaxError)) throw inner;
      }
    }
    throw e;
  }
}

const iso = (ms: number) => new Date(ms).toISOString();
const DEFAULT_POLICY = POLICIES[0];

/* ───────────── the manager ───────────── */

class LiveDataManager {
  readonly store: Store<LiveState>;
  /** the pre-fetch state: what the server renders, so client hydration matches it exactly */
  readonly initial: LiveState;
  private subscribers = 0;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private failures = new Map<string, number>();
  private aborter: AbortController | null = null;
  private inflight = new SwrCache();
  private watched = new Map<string, number>();
  private signalListeners = new Set<(s: Signal) => void>();
  private lastStatus = new Map<string, EligibilityStatus>();
  private lastMid = new Map<string, number>();
  private lastLifecycle = new Map<string, string>();
  private lastPaused = new Map<string, boolean | null>();
  private knownActions: Set<string> | null = null;
  private seq = 0;
  private visibilityHandler = () => {
    if (document.hidden) this.clearTimers();
    else if (this.subscribers > 0) this.kick();
  };

  constructor() {
    this.initial = {
      mode: DATA_MODE,
      registry: empty(),
      prices: empty(),
      chain: empty(),
      corporateActions: empty(),
      paused: empty(),
      symbolPrices: {},
      contracts: {},
      optional: { loaded: false, error: null, providers: [] },
      assets: DATA_MODE === "demo" ? [...ASSETS] : [],
      evaluatedAt: DATA_MODE === "demo" ? Date.now() : null,
      events: [],
      booting: DATA_MODE !== "demo",
    };
    this.store = createStore<LiveState>(this.initial);
  }

  /* lifecycle — ref-counted so unmounting the last consumer stops all polling */
  attach(): () => void {
    this.subscribers++;
    if (this.subscribers === 1) {
      this.aborter = new AbortController();
      document.addEventListener("visibilitychange", this.visibilityHandler);
      this.kick();
    }
    return () => {
      this.subscribers--;
      if (this.subscribers === 0) this.stop();
    };
  }

  private stop() {
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.clearTimers();
    this.aborter?.abort();
    this.aborter = null;
    // drop in-flight requests tied to the aborted controller so a re-attach (React StrictMode remount) starts fresh
    this.inflight = new SwrCache();
  }

  private clearTimers() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  private kick() {
    if (DATA_MODE === "demo") return;
    void this.poll("registry", "/api/assets", POLL.registry);
    void this.poll("chain", "/api/chain", POLL.chain);
    void this.poll("prices", "/api/prices", POLL.prices);
    void this.poll("corporateActions", "/api/corporate-actions", POLL.corporateActions);
    void this.poll("paused", "/api/chain/paused", POLL.registry);
    this.watched.forEach((_, sym) => this.pollSymbol(sym));
  }

  on(fn: (s: Signal) => void): () => void {
    this.signalListeners.add(fn);
    return () => this.signalListeners.delete(fn);
  }
  private emit(s: Signal) {
    this.signalListeners.forEach((l) => l(s));
  }

  /* ───────────── slice polling ───────────── */

  private async poll(key: "registry" | "prices" | "chain" | "corporateActions" | "paused", url: string, interval: number) {
    this.clearTimer(key);
    await this.fetchSlice(key, url);
    if (!this.aborter || this.aborter.signal.aborted || document.hidden) return;
    const fails = this.failures.get(key) ?? 0;
    // exponential backoff after failures, capped at 5 min; success returns to the normal cadence
    const next = fails === 0 ? interval : Math.min(5 * 60_000, Math.max(interval, 10_000) * 2 ** Math.min(fails, 5));
    this.timers.set(key, setTimeout(() => void this.poll(key, url, interval), next));
  }

  private clearTimer(key: string) {
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }

  /** Manual refresh (the Retry buttons). Bypasses the timer but not the in-flight dedupe. */
  refresh(key: "registry" | "prices" | "chain" | "corporateActions" | "paused") {
    if (DATA_MODE === "demo") return;
    const urls = { registry: "/api/assets", prices: "/api/prices", chain: "/api/chain", corporateActions: "/api/corporate-actions", paused: "/api/chain/paused" } as const;
    const intervals = { registry: POLL.registry, prices: POLL.prices, chain: POLL.chain, corporateActions: POLL.corporateActions, paused: POLL.registry } as const;
    this.failures.set(key, 0);
    void this.poll(key, urls[key], intervals[key]);
  }

  private patch<K extends keyof LiveState>(key: K, next: LiveState[K] | ((p: LiveState[K]) => LiveState[K])) {
    this.store.set((s) => ({ ...s, [key]: typeof next === "function" ? (next as (p: LiveState[K]) => LiveState[K])(s[key]) : next }));
  }

  private fetchSlice(key: "registry" | "prices" | "chain" | "corporateActions" | "paused", url: string): Promise<void> {
    return this.inflight.dedupe(`slice:${key}`, async () => {
      const signal = this.aborter?.signal;
      if (!signal || signal.aborted) return;
      this.patchSlice(key, (s) => ({ ...s, loading: true }));
      this.emit({ type: "request", target: url });
      try {
        const r = await call<unknown>(url, signal);
        this.failures.set(key, 0);
        this.applySlice(key, r.data, r.fetchedAt, r.latencyMs, r.error);
        this.emit({ type: "response", target: url, ok: true });
      } catch (e) {
        if (signal.aborted) return;
        this.failures.set(key, (this.failures.get(key) ?? 0) + 1);
        // keep the last good value; only the status changes
        this.patchSlice(key, (s) => ({ ...s, loading: false, error: errorMessage(e) }));
        this.emit({ type: "response", target: url, ok: false });
      } finally {
        this.settleBoot();
        this.recompute();
      }
    });
  }

  private patchSlice(key: string, fn: (s: Slice<never>) => Slice<never>) {
    this.store.set((st) => ({ ...st, [key]: fn(st[key as "registry"] as unknown as Slice<never>) }));
  }

  private applySlice(key: string, data: unknown, fetchedAt: number, latencyMs: number, serverError: string | null) {
    const base = { fetchedAt, loading: false, error: serverError, latencyMs, lastOkAt: Date.now() };
    if (key === "prices") {
      const map: Record<string, PriceSnapshot> = {};
      for (const q of data as PriceSnapshot[]) map[q.symbol] = q;
      this.patch("prices", { ...base, data: map });
    } else {
      this.store.set((st) => ({ ...st, [key]: { ...base, data } }));
    }
    if (key === "corporateActions") this.detectCorporateActions(data as CorporateAction[]);
  }

  private settleBoot() {
    const s = this.store.get();
    if (!s.booting) return;
    const settled = (x: Slice<unknown>) => x.data !== null || x.error !== null;
    if (settled(s.registry) && settled(s.chain)) this.patch("booting", false);
  }

  /* ───────────── watched symbols: fresher quote + pinned contract read ───────────── */

  watch(symbol: string): () => void {
    if (DATA_MODE === "demo") return () => {};
    this.watched.set(symbol, (this.watched.get(symbol) ?? 0) + 1);
    if (this.watched.get(symbol) === 1) this.pollSymbol(symbol);
    return () => {
      const n = (this.watched.get(symbol) ?? 1) - 1;
      if (n <= 0) {
        this.watched.delete(symbol);
        this.clearTimer(`sym:${symbol}`);
        this.clearTimer(`ctr:${symbol}`);
      } else this.watched.set(symbol, n);
    };
  }

  private pollSymbol(symbol: string) {
    void this.fetchSymbolPrice(symbol);
    const asset = this.store.get().registry.data?.find((a) => a.tokenSymbol === symbol);
    const dep = asset && primaryDeployment(asset);
    if (dep) void this.fetchContract(dep.contractAddress, symbol);
  }

  private async fetchSymbolPrice(symbol: string) {
    const key = `sym:${symbol}`;
    this.clearTimer(key);
    const signal = this.aborter?.signal;
    if (!signal || signal.aborted || !this.watched.has(symbol)) return;
    const url = `/api/prices/${encodeURIComponent(symbol)}`;
    await this.inflight.dedupe(key, async () => {
      this.emit({ type: "request", target: url });
      try {
        const r = await call<PriceSnapshot | null>(url, signal);
        this.failures.set(key, 0);
        this.store.set((s) => ({
          ...s,
          symbolPrices: { ...s.symbolPrices, [symbol]: { data: r.data, fetchedAt: r.fetchedAt, loading: false, error: r.error, latencyMs: r.latencyMs, lastOkAt: Date.now() } },
        }));
        this.emit({ type: "response", target: url, ok: true });
      } catch (e) {
        if (signal.aborted) return;
        this.failures.set(key, (this.failures.get(key) ?? 0) + 1);
        this.store.set((s) => {
          const prev = s.symbolPrices[symbol] ?? empty<PriceSnapshot | null>();
          return { ...s, symbolPrices: { ...s.symbolPrices, [symbol]: { ...prev, loading: false, error: errorMessage(e) } } };
        });
        this.emit({ type: "response", target: url, ok: false });
      } finally {
        this.recompute();
      }
    });
    if (!this.aborter || this.aborter.signal.aborted || document.hidden || !this.watched.has(symbol)) return;
    const fails = this.failures.get(key) ?? 0;
    this.timers.set(key, setTimeout(() => void this.fetchSymbolPrice(symbol), fails === 0 ? POLL.prices : Math.min(5 * 60_000, POLL.prices * 2 ** Math.min(fails, 4))));
  }

  /** Full contract read for one asset (bytecode, paused(), name/symbol/decimals/supply + explorer metadata). */
  async fetchContract(address: string, symbol?: string) {
    const key = address.toLowerCase();
    const signal = this.aborter?.signal;
    if (!signal || signal.aborted || DATA_MODE === "demo") return;
    const url = `/api/contracts/${address}`;
    await this.inflight.dedupe(`ctr:${key}`, async () => {
      this.store.set((s) => ({ ...s, contracts: { ...s.contracts, [key]: { ...(s.contracts[key] ?? { probe: null, explorer: null, fetchedAt: null, error: null, latencyMs: null }), loading: true } } }));
      this.emit({ type: "request", target: url });
      try {
        const t = await requestJson<{ data: { onchain: ContractProbe; explorer: ContractInfo["explorer"] }; meta: { fetchedAt: string; latencyMs: number | null } }>(url, { signal, timeoutMs: 15_000, retries: 1 });
        const d = t.data.data;
        this.store.set((s) => ({
          ...s,
          contracts: { ...s.contracts, [key]: { probe: d.onchain, explorer: d.explorer, fetchedAt: Date.parse(t.data.meta.fetchedAt), error: null, loading: false, latencyMs: t.data.meta.latencyMs ?? t.latencyMs } },
        }));
        this.emit({ type: "response", target: url, ok: true });
      } catch (e) {
        if (signal.aborted) return;
        this.store.set((s) => ({ ...s, contracts: { ...s.contracts, [key]: { ...(s.contracts[key] ?? { probe: null, explorer: null, fetchedAt: null, latencyMs: null }), loading: false, error: errorMessage(e) } } }));
        this.emit({ type: "response", target: url, ok: false });
      } finally {
        this.recompute();
      }
    });
    if (symbol && this.watched.has(symbol) && this.aborter && !this.aborter.signal.aborted && !document.hidden) {
      this.clearTimer(`ctr:${symbol}`);
      this.timers.set(`ctr:${symbol}`, setTimeout(() => void this.fetchContract(address, symbol), 60_000));
    }
  }

  /** Optional providers (CoinGecko / Alpha Vantage): configured-ness comes from the server, keys never reach the browser. */
  async loadOptionalProviders() {
    const signal = this.aborter?.signal ?? new AbortController().signal;
    try {
      const r = await call<{ providers: OptionalProviders["providers"] }>("/api/status", signal);
      this.patch("optional", { loaded: true, error: null, providers: r.data.providers });
    } catch (e) {
      this.patch("optional", (p) => ({ ...p, loaded: true, error: errorMessage(e) }));
    }
  }

  /* ───────────── derivation + change detection ───────────── */

  private recompute() {
    if (DATA_MODE === "demo") return;
    const s = this.store.get();
    if (!s.registry.data) return;
    const now = Date.now();
    const registryAt = iso(s.registry.fetchedAt ?? now);
    const sweep = s.paused.data;
    const assets = s.registry.data.map((r) => {
      const dep = primaryDeployment(r);
      const addr = dep?.contractAddress.toLowerCase() ?? "";
      const probe = s.contracts[addr]?.probe ?? null;
      let contract: ContractReads | null = null;
      if (probe) contract = { block: probe.block, blockTime: probe.blockTime, paused: probe.paused, hasBytecode: probe.hasBytecode };
      else if (sweep && addr in sweep.paused) contract = { block: sweep.block, blockTime: sweep.blockTime, paused: sweep.paused[addr], hasBytecode: null };
      const price = s.symbolPrices[r.tokenSymbol]?.data ?? s.prices.data?.[r.tokenSymbol] ?? null;
      const a = buildLiveAsset({ registry: r, price, contract, registryFetchedAt: registryAt, now });
      return DATA_MODE === "hybrid" ? withDemoGaps(a, now) : a;
    });
    this.detect(assets, now);
    this.store.set((st) => ({ ...st, assets, evaluatedAt: now }));
  }

  private pushEvent(e: Omit<EligibilityEventLive, "id" | "timestamp"> & { timestamp?: string }) {
    const ev: EligibilityEventLive = { id: `live_${++this.seq}`, timestamp: e.timestamp ?? iso(Date.now()), ...e };
    this.store.set((s) => ({ ...s, events: [ev, ...s.events].slice(0, 100) }));
  }

  /** Diffs successive REAL observations. Events only exist when something actually changed (or was actually checked). */
  private detect(assets: Asset[], now: number) {
    for (const a of assets) {
      const live = a.live!;
      const sym = a.symbol;
      const watched = this.watched.has(sym);

      // lifecycle / pause transitions are meaningful for every asset
      const lc = this.lastLifecycle.get(sym);
      if (lc !== undefined && lc !== live.lifecycle) {
        this.pushEvent({ symbol: sym, kind: "STATE_CHANGED", detail: `${lc} → ${live.lifecycle}`, source: "ROBINHOOD" });
        this.emit({ type: "state", symbol: sym, detail: `${lc} → ${live.lifecycle}` });
      }
      this.lastLifecycle.set(sym, live.lifecycle);
      const paused = a.state.paused.value;
      const pp = this.lastPaused.has(sym) ? this.lastPaused.get(sym) : undefined;
      // null = unreadable/unknown: going from unknown to known is a first observation, not a state change
      if (typeof pp === "boolean" && typeof paused === "boolean" && pp !== paused) {
        this.pushEvent({ symbol: sym, kind: "STATE_CHANGED", detail: `paused ${String(pp)} → ${String(paused)}`, source: "ONCHAIN" });
        this.emit({ type: "state", symbol: sym, detail: "paused" });
      }
      this.lastPaused.set(sym, paused);

      if (!watched) continue;

      const mid = live.price?.mid;
      if (mid !== undefined) {
        const prev = this.lastMid.get(sym);
        if (prev !== undefined && prev !== mid) {
          this.pushEvent({ symbol: sym, kind: "PRICE_UPDATED", detail: `$${prev.toFixed(2)} → $${mid.toFixed(2)}`, source: "ROBINHOOD" });
          this.emit({ type: "price", symbol: sym, from: prev, to: mid });
        }
        this.lastMid.set(sym, mid);
      }

      const status = evaluate(a, DEFAULT_POLICY, iso(now)).status;
      const prevStatus = this.lastStatus.get(sym);
      if (prevStatus === undefined) {
        this.pushEvent({ symbol: sym, kind: "STATE_CHECKED", detail: live.lifecycle, source: "ROBINHOOD" });
        this.pushEvent({ symbol: sym, kind: "ELIGIBILITY_EVALUATED", detail: `${status} · policy DEFAULT`, source: "ONCHAIN", current: status });
        this.emit({ type: "eligibility", symbol: sym, from: null, to: status });
      } else if (prevStatus !== status) {
        this.pushEvent({ symbol: sym, kind: "ELIGIBILITY_CHANGED", detail: `${prevStatus} → ${status} · policy DEFAULT`, source: "ONCHAIN", previous: prevStatus, current: status });
        this.emit({ type: "eligibility", symbol: sym, from: prevStatus, to: status });
      }
      this.lastStatus.set(sym, status);
    }
  }

  private detectCorporateActions(list: CorporateAction[]) {
    const ids = new Set(list.map((a) => a.id));
    if (this.knownActions) {
      for (const a of list) {
        if (!this.knownActions.has(a.id)) {
          this.pushEvent({ symbol: a.tokenSymbol, kind: "CORPORATE_ACTION", detail: `${a.type.replace(/_/g, " ")} · ${a.processDate ?? "no date"}`, source: "ROBINHOOD" });
          this.emit({ type: "corporate", symbol: a.tokenSymbol });
        }
      }
    }
    this.knownActions = ids;
  }
}

/* singleton — created lazily so importing this file on the server is harmless */
let instance: LiveDataManager | null = null;
export function liveManager(): LiveDataManager {
  return (instance ??= new LiveDataManager());
}

/* ───────────── health / freshness helpers ───────────── */

export type SliceKind = "price" | "registry" | "chain";

export function ageSec(fetchedAt: number | null, now: number): number | null {
  return fetchedAt === null ? null : Math.max(0, (now - fetchedAt) / 1000);
}

/** The single rule for the word LIVE: fetched successfully AND inside the freshness window. */
export function sliceHealth<T>(s: Slice<T>, kind: SliceKind, now: number): ProviderHealth {
  if (s.data === null) return s.error ? "OFFLINE" : "CONNECTING";
  const f: Freshness = freshnessOf(ageSec(s.fetchedAt, now), FRESHNESS[kind]);
  // the latest attempt failed (or the server had to serve a cached value): the last good value stays on screen, flagged
  if (s.error) return f === "STALE" ? "STALE" : "DEGRADED";
  return f === "FRESH" ? "LIVE" : f === "AGING" ? "LAST_KNOWN" : "STALE";
}
