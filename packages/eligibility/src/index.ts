/**
 * @comms/eligibility — typed client for the COMMS collateral eligibility API.
 * Read-only. Zero dependencies: it needs only a `fetch`.
 */

export type Eligibility = "ELIGIBLE" | "INELIGIBLE" | "CONDITIONAL" | "UNKNOWN";
export type CheckResult = "PASS" | "FAIL" | "UNKNOWN";

export type CheckId =
  | "assetActive"
  | "transferEnabled"
  | "oracleHealthy"
  | "priceFresh"
  | "redemptionEnabled"
  | "tokenPaused"
  | "transferRestricted"
  | "issuerRestriction"
  | "collateralSupported";

/** A built-in policy id ("DEFAULT", …), a stateless id from `policies.create`, or inline thresholds. */
export type PolicyRef =
  | string
  | {
      minLiquidityUsd: number;
      oracleRequired?: boolean;
      transferRequired?: boolean;
      redemptionRequired?: boolean;
    };

export interface Evidence {
  check: CheckId;
  result: CheckResult;
  required: boolean;
  value: boolean | null;
  /** e.g. ONCHAIN, ROBINHOOD, NONE (no source could supply it) */
  source: string;
  network: string | null;
  contract: string | null;
  blockNumber: number | null;
  timestamp: string | null;
  /** null = the source does not report a confidence. Never invented. */
  confidence: number | null;
  note: string | null;
}

export interface EligibilityResult {
  asset: string;
  symbol: string;
  name: string;
  registered: boolean;
  eligibility: Eligibility;
  /** eligibility === "ELIGIBLE" */
  eligible: boolean;
  policy: string;
  reasons: string[];
  /** the observed state each name describes (tokenPaused: false = not paused); null = UNKNOWN. See `evidence[].result` for PASS / FAIL. */
  checks: Record<CheckId, boolean | null>;
  summary: { passed: number; failed: number; unknown: number };
  evidence: Evidence[];
  score: number | null;
  sources: string[];
  degraded: Array<{ provider: string; error: string }>;
  mode: "live" | "hybrid" | "demo";
  evaluatedAt: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  minLiquidityUsd: number;
  oracleRequired: boolean;
  transferRequired: boolean;
  redemptionRequired: boolean;
  builtIn: boolean;
  /** false for stateless ids: the id encodes the policy, nothing is stored server-side */
  persisted?: boolean;
}

export interface FeedEvent {
  id: string;
  type: string;
  name: string;
  symbol: string | null;
  address: string | null;
  source: "ONCHAIN" | "ROBINHOOD";
  block: number | null;
  txHash: string | null;
  timestamp: string | null;
  detail: string;
}

export class CommsError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CommsError";
  }
}

export interface ClientOptions {
  /** e.g. https://comms.example — defaults to COMMS_API_URL, then http://localhost:3000 */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** abort a request after this many ms (default 15000) */
  timeoutMs?: number;
}

interface Envelope<T> {
  data: T | null;
  meta?: { error?: string };
}

export function createClient(options: ClientOptions = {}) {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const base = (options.baseUrl || env?.COMMS_API_URL || "http://localhost:3000").replace(/\/$/, "");
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await doFetch(`${base}${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = (await res.json().catch(() => null)) as Envelope<T> | null;
    if (!res.ok || !json || json.data === null) throw new CommsError(res.status, json?.meta?.error ?? `COMMS API responded ${res.status}`);
    return json.data;
  }

  return {
    /**
     * Check one Stock Token against a policy (default policy when omitted).
     * A result of "UNKNOWN" means COMMS lacks the evidence to decide — do not assume either way.
     */
    check: (asset: string, policy?: PolicyRef) => call<EligibilityResult>("POST", "/api/eligibility/check", { asset, policy }),
    assets: {
      list: () => call<unknown[]>("GET", "/api/assets"),
      get: (address: string) => call<unknown>("GET", `/api/assets/${encodeURIComponent(address)}`),
      eligibility: (address: string, policy = "DEFAULT") => call<EligibilityResult>("GET", `/api/assets/${encodeURIComponent(address)}/eligibility?policy=${encodeURIComponent(policy)}`),
      history: (address: string) => call<{ symbol: string; events: FeedEvent[] }>("GET", `/api/assets/${encodeURIComponent(address)}/history`),
    },
    policies: {
      get: (id: string) => call<Policy>("GET", `/api/policies/${encodeURIComponent(id)}`),
      create: (policy: Exclude<PolicyRef, string> & { name?: string }) => call<Policy>("POST", "/api/policies", policy),
    },
    events: {
      list: (q: { type?: string[]; symbol?: string; transfers?: boolean; blocks?: number; limit?: number } = {}) => {
        const p = new URLSearchParams();
        if (q.type?.length) p.set("type", q.type.join(","));
        if (q.symbol) p.set("symbol", q.symbol);
        if (q.transfers) p.set("transfers", "1");
        if (q.blocks) p.set("blocks", String(q.blocks));
        if (q.limit) p.set("limit", String(q.limit));
        return call<FeedEvent[]>("GET", `/api/events${p.size ? `?${p}` : ""}`);
      },
    },
  };
}

export type CommsClient = ReturnType<typeof createClient>;

/** A ready-made client configured from COMMS_API_URL. */
export const eligibility = createClient();
