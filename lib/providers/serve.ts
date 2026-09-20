import { NextResponse } from "next/server";
import { SwrCache } from "@/lib/data/cache";
import { errorMessage, type Timed } from "@/lib/data/request";
import type { ProviderId } from "@/types";

/** Shared across route handlers in one server instance (and across HMR reloads in dev). */
const g = globalThis as unknown as { __commsCache?: SwrCache };
export const serverCache = (g.__commsCache ??= new SwrCache());

export interface ApiMeta {
  provider: ProviderId;
  /** ISO — when the upstream data was actually fetched (not when this response was served) */
  fetchedAt: string;
  /** latency of the last real upstream request; null if none was made by this instance */
  latencyMs: number | null;
  /** served from cache while a refresh failed or is in flight */
  stale: boolean;
  error?: string;
}

export interface ApiEnvelope<T> {
  data: T | null;
  meta: ApiMeta;
}

/**
 * Cached, deduplicated upstream call → JSON envelope. On upstream failure it serves the last good value
 * flagged `stale` (with the error); with no prior value it answers 502 and `data: null` — never invented data.
 */
export async function serve<T>(provider: ProviderId, key: string, ttlSec: number, fetcher: () => Promise<Timed<T>>): Promise<NextResponse> {
  const cacheHeader = `public, s-maxage=${ttlSec}, stale-while-revalidate=${ttlSec * 4}`;
  try {
    const r = await serverCache.get(key, fetcher, { ttlMs: ttlSec * 1000, staleMs: ttlSec * 1000 * 20 });
    const meta: ApiMeta = {
      provider,
      fetchedAt: new Date(r.at).toISOString(),
      latencyMs: r.value.latencyMs,
      stale: r.stale,
      ...(r.error ? { error: errorMessage(r.error) } : {}),
    };
    return NextResponse.json({ data: r.value.data, meta } satisfies ApiEnvelope<T>, { headers: { "cache-control": r.error ? "no-store" : cacheHeader } });
  } catch (e) {
    const meta: ApiMeta = { provider, fetchedAt: new Date().toISOString(), latencyMs: null, stale: false, error: errorMessage(e) };
    return NextResponse.json({ data: null, meta } satisfies ApiEnvelope<T>, { status: 502, headers: { "cache-control": "no-store" } });
  }
}

export function fail(provider: ProviderId, status: number, message: string): NextResponse {
  const meta: ApiMeta = { provider, fetchedAt: new Date().toISOString(), latencyMs: null, stale: false, error: message };
  return NextResponse.json({ data: null, meta }, { status, headers: { "cache-control": "no-store" } });
}
