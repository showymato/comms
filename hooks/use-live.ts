"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DATA_MODE } from "@/lib/data/config";
import { ageSec, liveManager, sliceHealth, type LiveState, type Signal, type SliceKind, type Slice } from "@/lib/data/live-manager";
import { ASSETS } from "@/data/assets";
import type { Asset, ProviderHealth } from "@/types";

/** Attach the manager for the lifetime of the calling component. Ref-counted: polling stops when no one is attached. */
export function useLiveConnection() {
  useEffect(() => liveManager().attach(), []);
}

/** Select a stable slice of manager state. The selector must return a reference that only changes when the data does. */
export function useLive<T>(select: (s: LiveState) => T): T {
  const m = liveManager();
  return useSyncExternalStore(m.store.subscribe, () => select(m.store.get()), () => select(m.initial));
}

/** Ticking epoch-ms clock (client only; 0 during SSR so markup matches). */
export function useNowMs(intervalMs = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Every asset with evidence attached: the real registry in live/hybrid mode, the labelled demo set in demo mode. */
export function useAssets(): { assets: Asset[]; loading: boolean; evaluatedAt: number | null; error: string | null } {
  const assets = useLive((s) => s.assets);
  const registry = useLive((s) => s.registry);
  if (DATA_MODE === "demo") return { assets: [...ASSETS], loading: false, evaluatedAt: null, error: null };
  return { assets, loading: registry.data === null && registry.error === null, evaluatedAt: registry.fetchedAt, error: registry.data === null ? registry.error : null };
}

export function useAsset(idOrSymbol: string): { asset: Asset | null; loading: boolean; error: string | null } {
  const { assets, loading, error } = useAssets();
  const asset = useMemo(() => {
    const q = idOrSymbol.toLowerCase();
    return assets.find((a) => a.address.toLowerCase() === q || a.symbol.toLowerCase() === q) ?? null;
  }, [assets, idOrSymbol]);
  return { asset, loading, error };
}

/** Keep the fresher per-symbol quote + pinned contract read polling while this asset is on screen. */
export function useWatchSymbol(symbol: string | null) {
  useEffect(() => (symbol ? liveManager().watch(symbol) : undefined), [symbol]);
}

export function useSignal(fn: (s: Signal) => void) {
  useEffect(() => liveManager().on(fn), [fn]);
}

export function useSliceHealth<T>(slice: Slice<T>, kind: SliceKind): { health: ProviderHealth; ageSec: number | null } {
  const now = useNowMs(1000);
  if (now === 0) return { health: slice.data === null ? "CONNECTING" : "LAST_KNOWN", ageSec: null };
  return { health: sliceHealth(slice, kind, now), ageSec: ageSec(slice.fetchedAt, now) };
}
