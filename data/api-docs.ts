import type { Lang } from "@/lib/highlight";

export type Language = "javascript" | "typescript" | "python" | "curl";
export const LANGUAGES: { id: Language; label: string }[] = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "curl", label: "curl" },
];

export const BASE_URL = "https://api.comms.example";
export const SAMPLE_TOKEN = "0x1234567890abcdef1234567890abcdef12345678";

export interface Param {
  name: string;
  in: "path" | "body" | "query";
  type: string;
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  description: string;
  section: "Eligibility" | "Assets" | "Policies" | "Webhooks";
  params: Param[];
  body?: Record<string, unknown>;
  response: Record<string, unknown>;
}

const eligibilityResponse = {
  address: SAMPLE_TOKEN,
  policy: "DEFAULT",
  status: "ELIGIBLE",
  eligible: true,
  score: 100,
  reasons: ["ALL_CHECKS_PASSED"],
  checks: { passed: 9, failed: 0, unknown: 0 },
  evidence: [
    { check: "transferEnabled", result: true, source: "ONCHAIN", blockNumber: 1204331, timestamp: "2026-09-20T21:03:42Z", confidence: 1.0 },
  ],
  evaluatedAt: "2026-09-20T21:03:42Z",
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "eligibility-check",
    method: "POST",
    path: "/v1/eligibility/check",
    summary: "Run an eligibility check",
    section: "Eligibility",
    description:
      "Evaluates the current state of a Stock Token against a policy and returns one of ELIGIBLE, INELIGIBLE, CONDITIONAL or UNKNOWN, with the reasons and the evidence behind each check. Read-only: nothing is signed, executed or custodied.",
    params: [
      { name: "address", in: "body", type: "string", required: true, description: "Token contract address." },
      { name: "policy", in: "body", type: "string", required: false, description: "Policy id. Defaults to DEFAULT." },
    ],
    body: { address: SAMPLE_TOKEN, policy: "DEFAULT" },
    response: eligibilityResponse,
  },
  {
    id: "asset-eligibility",
    method: "GET",
    path: "/v1/assets/{address}/eligibility",
    summary: "Current eligibility for an asset",
    section: "Assets",
    description: "Returns the most recent eligibility result for a token, including every check and its evidence.",
    params: [
      { name: "address", in: "path", type: "string", required: true, description: "Token contract address." },
      { name: "policy", in: "query", type: "string", required: false, description: "Policy id. Defaults to DEFAULT." },
    ],
    response: eligibilityResponse,
  },
  {
    id: "asset-history",
    method: "GET",
    path: "/v1/assets/{address}/eligibility/history",
    summary: "Eligibility history for an asset",
    section: "Assets",
    description: "Returns every status change for a token, newest first, with the previous status, the new status and the reason.",
    params: [{ name: "address", in: "path", type: "string", required: true, description: "Token contract address." }],
    response: {
      address: SAMPLE_TOKEN,
      events: [
        { timestamp: "2026-09-20T14:48:32Z", previous: "INELIGIBLE", current: "ELIGIBLE", reason: "TRANSFER_REENABLED" },
        { timestamp: "2026-09-20T14:42:10Z", previous: "ELIGIBLE", current: "INELIGIBLE", reason: "TRANSFER_DISABLED" },
      ],
    },
  },
  {
    id: "policy-get",
    method: "GET",
    path: "/v1/policies/{id}",
    summary: "Fetch a policy",
    section: "Policies",
    description: "Returns a policy and its requirements.",
    params: [{ name: "id", in: "path", type: "string", required: true, description: "Policy id." }],
    response: { id: "DEFAULT", minLiquidityUsd: 100000, oracleRequired: true, transferRequired: true, redemptionRequired: true },
  },
  {
    id: "policy-create",
    method: "POST",
    path: "/v1/policies",
    summary: "Create a policy",
    section: "Policies",
    description: "Creates a protocol-specific policy. A policy sets a minimum liquidity and whether a healthy oracle, enabled transfers and enabled redemption are required.",
    params: [
      { name: "name", in: "body", type: "string", required: true, description: "Unique policy name." },
      { name: "minLiquidityUsd", in: "body", type: "number", required: true, description: "Minimum liquidity in USD." },
      { name: "oracleRequired", in: "body", type: "boolean", required: true, description: "Require a healthy, fresh oracle." },
      { name: "transferRequired", in: "body", type: "boolean", required: true, description: "Require transfers to be enabled." },
      { name: "redemptionRequired", in: "body", type: "boolean", required: true, description: "Require redemption to be enabled." },
    ],
    body: { name: "INSTITUTIONAL", minLiquidityUsd: 2000000, oracleRequired: true, transferRequired: true, redemptionRequired: true },
    response: { id: "INSTITUTIONAL", minLiquidityUsd: 2000000, oracleRequired: true, transferRequired: true, redemptionRequired: true },
  },
  {
    id: "webhook-create",
    method: "POST",
    path: "/v1/webhooks",
    summary: "Create a webhook endpoint",
    section: "Webhooks",
    description: "Registers an endpoint to receive eligibility events as they happen.",
    params: [
      { name: "url", in: "body", type: "string", required: true, description: "HTTPS endpoint that receives events." },
      { name: "events", in: "body", type: "string[]", required: true, description: "Event types to subscribe to." },
    ],
    body: { url: "https://your-protocol.example/hooks/comms", events: ["ELIGIBILITY_CHANGED", "ASSET_PAUSED"] },
    response: { id: "wh_01", url: "https://your-protocol.example/hooks/comms", events: ["ELIGIBILITY_CHANGED", "ASSET_PAUSED"], status: "ACTIVE" },
  },
];

export const json = (v: unknown) => JSON.stringify(v, null, 2);

const url = (e: ApiEndpoint) => `${BASE_URL}${e.path.replace("{address}", SAMPLE_TOKEN).replace("{id}", "DEFAULT")}`;

/** Request sample for any endpoint, in any supported language. */
export function requestSample(e: ApiEndpoint, lang: Language): { code: string; hl: Lang } {
  const u = url(e);
  const body = e.body ? json(e.body) : null;
  switch (lang) {
    case "curl":
      return {
        hl: "curl",
        code: [
          `curl -X ${e.method} "${u}" \\`,
          `  -H "Authorization: Bearer $COMMS_API_KEY"${body ? " \\" : ""}`,
          ...(body ? [`  -H "Content-Type: application/json" \\`, `  -d '${JSON.stringify(e.body)}'`] : []),
        ].join("\n"),
      };
    case "python":
      return {
        hl: "python",
        code: [
          "import os, requests",
          "",
          `res = requests.${e.method.toLowerCase()}(`,
          `    "${u}",`,
          `    headers={"Authorization": f"Bearer {os.environ['COMMS_API_KEY']}"},`,
          ...(body ? [`    json=${JSON.stringify(e.body).replace(/true/g, "True").replace(/false/g, "False")},`] : []),
          ")",
          "data = res.json()",
        ].join("\n"),
      };
    case "typescript":
      return {
        hl: "typescript",
        code: [
          `const res = await fetch("${u}", {`,
          `  method: "${e.method}",`,
          `  headers: {`,
          `    Authorization: \`Bearer \${process.env.COMMS_API_KEY}\`,`,
          ...(body ? [`    "Content-Type": "application/json",`] : []),
          `  },`,
          ...(body ? [`  body: JSON.stringify(${JSON.stringify(e.body)}),`] : []),
          `});`,
          `const data: Record<string, unknown> = await res.json();`,
        ].join("\n"),
      };
    default:
      return {
        hl: "javascript",
        code: [
          `const res = await fetch("${u}", {`,
          `  method: "${e.method}",`,
          `  headers: {`,
          `    Authorization: \`Bearer \${process.env.COMMS_API_KEY}\`,`,
          ...(body ? [`    "Content-Type": "application/json",`] : []),
          `  },`,
          ...(body ? [`  body: JSON.stringify(${JSON.stringify(e.body)}),`] : []),
          `});`,
          `const data = await res.json();`,
        ].join("\n"),
      };
  }
}

/** SDK snippets for the primary call. */
export function sdkSample(lang: Language, withPolicy: boolean): { code: string; hl: Lang } {
  const args = withPolicy ? "tokenAddress, policyId" : "tokenAddress";
  switch (lang) {
    case "python":
      return {
        hl: "python",
        code: `result = eligibility.check(${args.replace("tokenAddress", "token_address").replace("policyId", "policy_id")})\n\nif result.eligible:\n    # protocol can continue\n    ...`,
      };
    case "curl":
      return {
        hl: "curl",
        code: `curl -X POST "${BASE_URL}/v1/eligibility/check" \\\n  -H "Authorization: Bearer $COMMS_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"address":"${SAMPLE_TOKEN}"${withPolicy ? ',"policy":"INSTITUTIONAL"' : ""}}'`,
      };
    case "typescript":
      return {
        hl: "typescript",
        code: `const result: EligibilityResult = await eligibility.check(\n  ${args.replace(", ", ",\n  ")}\n);\n\nif (result.eligible) {\n  // protocol can continue\n}`,
      };
    default:
      return {
        hl: "javascript",
        code: `const result = await eligibility.check(\n  ${args.replace(", ", ",\n  ")}\n);\n\nif (result.eligible) {\n  // protocol can continue\n}`,
      };
  }
}
