/**
 * Client side of the real event stream. One poller for the whole app (ref-counted, paused while the tab is hidden),
 * conservative cadence, request cancellation and exponential backoff. Talks only to /api/events.
 *
 * Architecture note: RPC → (server) log scan → cache → this poller → state → UI. With a WebSocket RPC configured the
 * server could push; without one this is the conservative-polling fallback.
 */
import { createStore, type Store } from "@/lib/store";
import { errorMessage, requestJson } from "./request";
import type { ApiEnvelope } from "@/lib/providers/serve";
import type { FeedEvent } from "@/lib/live/event-feed";

export interface FeedState {
  events: FeedEvent[];
  /** ids that arrived after the first successful load — these animate into the feed */
  fresh: string[];
  range: { fromBlock: number; toBlock: number; scanned: number } | null;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  transfers: boolean;
  degraded: Array<{ source: string; error: string }>;
}

const INTERVAL = 15_000;
const MAX_BACKOFF = 5 * 60_000;

class EventsFeed {
  readonly store: Store<FeedState> = createStore<FeedState>({ events: [], fresh: [], range: null, fetchedAt: null, loading: false, error: null, transfers: true, degraded: [] });
  readonly initial = this.store.get();
  private refs = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private aborter: AbortController | null = null;
  private failures = 0;
  private known: Set<string> | null = null;

  attach(): () => void {
    this.refs++;
    if (this.refs === 1) {
      document.addEventListener("visibilitychange", this.onVisibility);
      void this.tick();
    }
    return () => {
      this.refs--;
      if (this.refs === 0) {
        document.removeEventListener("visibilitychange", this.onVisibility);
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.aborter?.abort();
        this.aborter = null;
      }
    };
  }

  setTransfers(on: boolean) {
    if (this.store.get().transfers === on) return;
    this.known = null;
    this.store.set((s) => ({ ...s, transfers: on, events: [], fresh: [] }));
    if (this.refs > 0) void this.tick();
  }

  refresh() {
    if (this.refs > 0) void this.tick();
  }

  private onVisibility = () => {
    if (!document.hidden && this.refs > 0) void this.tick();
    else if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), ms);
  }

  private async tick() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.aborter?.abort();
    const ctrl = new AbortController();
    this.aborter = ctrl;
    this.store.set((s) => ({ ...s, loading: true }));
    try {
      const { transfers } = this.store.get();
      const t = await requestJson<ApiEnvelope<FeedEvent[]> & { range: FeedState["range"] }>(`/api/events?limit=80&blocks=1500${transfers ? "&transfers=1" : ""}`, { signal: ctrl.signal, timeoutMs: 15_000, retries: 1 });
      if (t.data.data === null) throw new Error(t.data.meta.error ?? "Empty response");
      const incoming = t.data.data;
      const meta = t.data.meta as ApiEnvelope<unknown>["meta"] & { degraded?: FeedState["degraded"] };
      const fresh = this.known ? incoming.filter((e) => !this.known!.has(e.id)).map((e) => e.id) : [];
      this.known = new Set([...(this.known ?? []), ...incoming.map((e) => e.id)]);
      this.failures = 0;
      this.store.set((s) => ({
        ...s,
        events: incoming,
        fresh: [...new Set([...fresh, ...s.fresh])].slice(0, 40),
        range: t.data.range,
        fetchedAt: Date.now(),
        loading: false,
        error: null,
        degraded: meta.degraded ?? [],
      }));
      this.schedule(INTERVAL);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      this.failures++;
      this.store.set((s) => ({ ...s, loading: false, error: errorMessage(e) }));
      this.schedule(Math.min(MAX_BACKOFF, INTERVAL * 2 ** this.failures));
    }
  }
}

let instance: EventsFeed | null = null;
export const eventsFeed = () => (instance ??= new EventsFeed());
