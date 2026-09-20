import { createStore, type Store } from "@/lib/store";

/**
 * Browser-local persistence for things that are the visitor's own preferences: watchlist, saved policies, webhook endpoints, recent checks.
 * It lives in this browser only — it is NOT synced to any server or account, and the UI labels it LOCAL wherever it appears.
 * Reads and writes are wrapped: storage can be unavailable (private mode, blocked cookies), in which case the value simply does not persist.
 */
export interface LocalStore<T> extends Store<T> {
  readonly initial: T;
  /** true once the persisted value has been read (client only) */
  hydrated(): boolean;
}

const registry = new Map<string, LocalStore<unknown>>();

export function localStore<T>(key: string, initial: T): LocalStore<T> {
  const existing = registry.get(key);
  if (existing) return existing as LocalStore<T>;

  const inner = createStore<T>(initial);
  let loaded = false;

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) inner.set(JSON.parse(raw) as T);
    } catch {
      /* unreadable or blocked: keep the initial value */
    }
  };

  const store: LocalStore<T> = {
    initial,
    hydrated: () => loaded,
    get() {
      load();
      return inner.get();
    },
    set(next) {
      load();
      inner.set(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(inner.get()));
      } catch {
        /* quota or blocked: the change stays in memory for this session */
      }
    },
    subscribe(fn) {
      const off = inner.subscribe(fn);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== key) return;
        try {
          inner.set(e.newValue ? (JSON.parse(e.newValue) as T) : initial);
        } catch {
          /* ignore malformed */
        }
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        off();
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
  registry.set(key, store as LocalStore<unknown>);
  return store;
}
