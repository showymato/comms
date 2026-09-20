/**
 * Resilient JSON request helper: timeout + AbortController, exponential backoff with a hard retry limit,
 * and latency measurement of the request that actually completed. Never retries 4xx (except 429).
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface RequestOptions extends Omit<RequestInit, "signal"> {
  timeoutMs?: number;
  /** extra attempts after the first (default 2) */
  retries?: number;
  backoffMs?: number;
  signal?: AbortSignal;
}

export interface Timed<T> {
  data: T;
  latencyMs: number;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });

const retryable = (e: unknown) =>
  e instanceof HttpError ? e.status === 429 || e.status >= 500 : !(e instanceof DOMException && e.name === "AbortError");

export async function requestJson<T>(url: string, opts: RequestOptions = {}): Promise<Timed<T>> {
  const { timeoutMs = 8000, retries = 2, backoffMs = 400, signal, ...init } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(new DOMException("Timeout", "TimeoutError")), timeoutMs);
    const t0 = performance.now();
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      const latencyMs = Math.round(performance.now() - t0);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(res.status, body.slice(0, 200) || `HTTP ${res.status}`);
      }
      return { data: (await res.json()) as T, latencyMs };
    } catch (e) {
      lastError = signal?.aborted ? new DOMException("Aborted", "AbortError") : ctrl.signal.aborted && !(e instanceof HttpError) ? new Error(`Timed out after ${timeoutMs} ms`) : e;
      if (signal?.aborted || attempt === retries || !retryable(lastError)) break;
      await sleep(backoffMs * 2 ** attempt + Math.random() * 120, signal).catch(() => {});
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  throw lastError;
}

export const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
