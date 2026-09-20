/**
 * The real COMMS HTTP API. Every entry corresponds to a route handler under app/api. Examples use `0x…` placeholders —
 * the playground on each entry sends a real request and shows the real response.
 */
export type ApiSection = "Eligibility" | "Assets" | "Policies" | "Events" | "Webhooks" | "System";

export interface ApiParam {
  name: string;
  in: "path" | "body" | "query";
  type: string;
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  section: ApiSection;
  method: "GET" | "POST";
  path: string;
  summary: string;
  description: string;
  params: ApiParam[];
  /** request the playground sends; `{{asset}}` is replaced by a real registry address once the registry has loaded */
  try: { method: "GET" | "POST"; path: string; body?: unknown };
  /** documented response shape (placeholders, not data) */
  shape: unknown;
}

const decision = {
  asset: "0x…",
  symbol: "…",
  registered: true,
  eligibility: "ELIGIBLE | INELIGIBLE | CONDITIONAL | UNKNOWN",
  eligible: false,
  policy: "DEFAULT",
  reasons: ["INSUFFICIENT_EVIDENCE"],
  checks: { assetActive: true, transferEnabled: null, oracleHealthy: null, priceFresh: true, redemptionEnabled: null, tokenPaused: false, transferRestricted: null, issuerRestriction: null, collateralSupported: null },
  summary: { passed: 3, failed: 0, unknown: 6 },
  evidence: [{ check: "assetActive", result: "PASS", required: true, source: "ROBINHOOD", network: null, contract: null, blockNumber: null, timestamp: "ISO-8601", confidence: null, note: "…" }],
  evaluatedAt: "ISO-8601",
};

export const API_SPEC: ApiEndpoint[] = [
  {
    id: "eligibility-check",
    section: "Eligibility",
    method: "POST",
    path: "/api/eligibility/check",
    summary: "Run an eligibility check",
    description: "Evaluates a Stock Token against a policy using live evidence and returns one of ELIGIBLE, INELIGIBLE, CONDITIONAL or UNKNOWN with the reasons and the evidence behind every check. In `checks`, each key is the observed state its name describes (`tokenPaused: false` = not paused) and null means UNKNOWN (no verifiable evidence); `evidence[].result` says whether that state satisfies the policy. Read-only.",
    params: [
      { name: "asset", in: "body", type: "string", required: true, description: "Contract address or token symbol." },
      { name: "policy", in: "body", type: "string | object", required: false, description: 'Policy id ("DEFAULT", "INSTITUTIONAL", "FLEXIBLE", or a `c.…` id from POST /api/policies) or an inline { minLiquidityUsd, oracleRequired, transferRequired, redemptionRequired }.' },
    ],
    try: { method: "POST", path: "/api/eligibility/check", body: { asset: "{{asset}}", policy: "DEFAULT" } },
    shape: decision,
  },
  {
    id: "assets-list",
    section: "Assets",
    method: "GET",
    path: "/api/assets",
    summary: "List Stock Tokens",
    description: "The normalized Robinhood Stock Token registry: symbol, name, contract deployments, lifecycle status, current and pending multiplier, trading capabilities. Cached server-side for 5 minutes.",
    params: [],
    try: { method: "GET", path: "/api/assets" },
    shape: { data: [{ id: "0x…", tokenSymbol: "…", tokenName: "…", deployments: [{ contractAddress: "0x…", chainId: 4663, networkName: "Robinhood Chain" }], status: "ACTIVE | INACTIVE | UNKNOWN", currentMultiplier: "1.000000000000000000", pendingMultiplier: null, tradingCapabilities: { market: { whole: "TRADABLE", fractional: "TRADABLE" } } }], meta: { provider: "robinhood", fetchedAt: "ISO-8601", latencyMs: 0, stale: false } },
  },
  {
    id: "assets-one",
    section: "Assets",
    method: "GET",
    path: "/api/assets/{address}",
    summary: "Get one Stock Token",
    description: "Registry row, latest quote (raw underlying bid/ask — not multiplier-adjusted) and a pinned-block contract read for one token. `address` may be a contract address or a symbol.",
    params: [{ name: "address", in: "path", type: "string", required: true, description: "Contract address or symbol." }],
    try: { method: "GET", path: "/api/assets/{{asset}}" },
    shape: { data: { registry: "…", asset: "…", contract: { block: 0, paused: false, hasBytecode: true } }, meta: { provider: "robinhood", errors: {} } },
  },
  {
    id: "assets-eligibility",
    section: "Assets",
    method: "GET",
    path: "/api/assets/{address}/eligibility",
    summary: "Current eligibility for a token",
    description: "Same decision object as the check endpoint, addressed by resource. Optional `policy` query parameter.",
    params: [
      { name: "address", in: "path", type: "string", required: true, description: "Contract address or symbol." },
      { name: "policy", in: "query", type: "string", required: false, description: "Policy id. Defaults to DEFAULT." },
    ],
    try: { method: "GET", path: "/api/assets/{{asset}}/eligibility?policy=DEFAULT" },
    shape: { data: decision, meta: { provider: "comms", fetchedAt: "ISO-8601" } },
  },
  {
    id: "assets-history",
    section: "Assets",
    method: "GET",
    path: "/api/assets/{address}/history",
    summary: "What happened to a token",
    description: "Onchain lifecycle logs (Paused, Unpaused, Upgraded, OwnershipTransferred) and Robinhood corporate actions for one token. COMMS stores no eligibility history yet, so `eligibilityHistory` is null.",
    params: [
      { name: "address", in: "path", type: "string", required: true, description: "Contract address or symbol." },
      { name: "blocks", in: "query", type: "number", required: false, description: "Blocks to scan back (default 20000, max 20000)." },
    ],
    try: { method: "GET", path: "/api/assets/{{asset}}/history" },
    shape: { data: { symbol: "…", events: [{ id: "…", type: "CONTRACT_EVENT", name: "Upgraded", block: 0, txHash: "0x…", timestamp: "ISO-8601", source: "ONCHAIN" }], eligibilityHistory: null }, range: { fromBlock: 0, toBlock: 0, scanned: 0 } },
  },
  {
    id: "policies-post",
    section: "Policies",
    method: "POST",
    path: "/api/policies",
    summary: "Create a policy",
    description: "Validates a policy and returns it with a stateless id. Nothing is stored server-side (`persisted: false`); the id encodes the policy and can be passed as `policy` to the check endpoint.",
    params: [
      { name: "minLiquidityUsd", in: "body", type: "number", required: true, description: "Minimum verified liquidity in USD." },
      { name: "oracleRequired", in: "body", type: "boolean", required: false, description: "Default true." },
      { name: "transferRequired", in: "body", type: "boolean", required: false, description: "Default true." },
      { name: "redemptionRequired", in: "body", type: "boolean", required: false, description: "Default true." },
      { name: "name", in: "body", type: "string", required: false, description: "Display name." },
    ],
    try: { method: "POST", path: "/api/policies", body: { name: "MY_POLICY", minLiquidityUsd: 250000, oracleRequired: true, transferRequired: true, redemptionRequired: false } },
    shape: { data: { id: "c.…", name: "MY_POLICY", minLiquidityUsd: 250000, oracleRequired: true, transferRequired: true, redemptionRequired: false, builtIn: false, persisted: false } },
  },
  {
    id: "policies-get",
    section: "Policies",
    method: "GET",
    path: "/api/policies/{id}",
    summary: "Get a policy",
    description: "A built-in policy (DEFAULT, INSTITUTIONAL, FLEXIBLE) or a stateless `c.…` id.",
    params: [{ name: "id", in: "path", type: "string", required: true, description: "Policy id." }],
    try: { method: "GET", path: "/api/policies/DEFAULT" },
    shape: { data: { id: "DEFAULT", minLiquidityUsd: 100000, oracleRequired: true, transferRequired: true, redemptionRequired: true } },
  },
  {
    id: "events",
    section: "Events",
    method: "GET",
    path: "/api/events",
    summary: "Real events",
    description: "Onchain contract logs from Robinhood Chain and Robinhood corporate actions, each with source, block, transaction hash and timestamp where they exist. Nothing is generated: an empty list means nothing happened in the scanned range.",
    params: [
      { name: "type", in: "query", type: "string", required: false, description: "Comma list: CORPORATE_ACTION, TRANSFER_RESTRICTION, CONTRACT_EVENT." },
      { name: "symbol", in: "query", type: "string", required: false, description: "Only this token." },
      { name: "transfers", in: "query", type: "0 | 1", required: false, description: "Include Transfer logs (default 0)." },
      { name: "blocks", in: "query", type: "number", required: false, description: "Blocks to scan back (100–20000, default 2000)." },
      { name: "limit", in: "query", type: "number", required: false, description: "Max events (1–200, default 50)." },
    ],
    try: { method: "GET", path: "/api/events?transfers=1&limit=5" },
    shape: { data: [{ id: "log:0x…:0", type: "CONTRACT_EVENT", name: "Transfer", symbol: "…", source: "ONCHAIN", block: 0, txHash: "0x…", timestamp: "ISO-8601", detail: "…" }], range: { fromBlock: 0, toBlock: 0, scanned: 0 } },
  },
  {
    id: "webhooks-get",
    section: "Webhooks",
    method: "GET",
    path: "/api/webhooks",
    summary: "Webhook capabilities",
    description: "What the webhook infrastructure does today: on-demand signed test deliveries. It does not yet store endpoints or push events on its own.",
    params: [],
    try: { method: "GET", path: "/api/webhooks" },
    shape: { data: { events: ["ELIGIBILITY_CHANGED", "…"], testDelivery: true, persistentEndpoints: false, scheduledDelivery: false } },
  },
  {
    id: "webhooks-post",
    section: "Webhooks",
    method: "POST",
    path: "/api/webhooks",
    summary: "Send a test delivery",
    description: "Sends ONE real, HMAC-signed `webhook.test` request to a public https endpoint and returns the actual HTTP status, latency and response preview. Private, loopback and non-https targets are rejected.",
    params: [
      { name: "url", in: "body", type: "string", required: true, description: "Public https endpoint." },
      { name: "event", in: "body", type: "string", required: false, description: "Event name placed in the payload." },
      { name: "secret", in: "body", type: "string", required: false, description: "If set, the body is signed: x-comms-signature = sha256=HMAC(secret, body)." },
    ],
    try: { method: "POST", path: "/api/webhooks", body: { url: "https://example.com/comms-webhook", event: "ELIGIBILITY_CHANGED" } },
    shape: { data: { id: "dlv_…", delivered: true, response: { status: 200, latencyMs: 0, bodyPreview: "…" }, signed: true } },
  },
  {
    id: "status",
    section: "System",
    method: "GET",
    path: "/api/status",
    summary: "Service status",
    description: "Health of the upstream providers, from real recent requests.",
    params: [],
    try: { method: "GET", path: "/api/status" },
    shape: { data: { providers: [{ id: "robinhood", health: "LIVE", latencyMs: 0 }] } },
  },
];

export const SECTIONS: ApiSection[] = ["Eligibility", "Assets", "Policies", "Events", "Webhooks", "System"];
