/**
 * Tiny TTL cache with stale-while-revalidate semantics. Used on the server (route handlers) and in the
 * browser (LiveDataManager). A hit never blanks the UI: stale values are returned while a refresh runs.
 */
export interface CacheEntry<T> {
  value: T;
  /** epoch ms the value was fetched */
  at: number;
}

export class SwrCache {
  private map = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  peek<T>(key: string): CacheEntry<T> | undefined {
    return this.map.get(key) as CacheEntry<T> | undefined;
  }

  set<T>(key: string, value: T, at = Date.now()) {
    this.map.set(key, { value, at });
  }

  /**
   * Returns the cached value if younger than `ttlMs`. If older but within `staleMs`, returns it immediately and
   * refreshes in the background. Otherwise awaits the fetcher. Concurrent callers share one in-flight request.
   * If the fetcher throws and a (possibly stale) value exists, that value is returned with `stale: true`.
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    { ttlMs, staleMs = ttlMs * 10 }: { ttlMs: number; staleMs?: number },
  ): Promise<{ value: T; at: number; stale: boolean; error?: unknown }> {
    const hit = this.map.get(key) as CacheEntry<T> | undefined;
    const age = hit ? Date.now() - hit.at : Infinity;
    if (hit && age <= ttlMs) return { value: hit.value, at: hit.at, stale: false };

    const refresh = () => this.dedupe(key, async () => {
      const value = await fetcher();
      this.set(key, value);
      return value;
    });

    if (hit && age <= staleMs) {
      refresh().catch(() => {});
      return { value: hit.value, at: hit.at, stale: true };
    }
    try {
      const value = await refresh();
      return { value, at: this.map.get(key)!.at, stale: false };
    } catch (error) {
      if (hit) return { value: hit.value, at: hit.at, stale: true, error };
      throw error;
    }
  }

  dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const p = run().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }
}
