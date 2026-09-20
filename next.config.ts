import type { NextConfig } from "next";
import path from "node:path";

/**
 * @wagmi/connectors bundles every connector, and Base Account's CDP SDK lazily imports optional x402 payment packages that
 * are not installed. COMMS never sends payments, so those specifiers resolve to an empty module.
 */
const X402 = ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client", "@x402/svm"];
const stub = "./lib/wallet/empty-module.js";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname), resolveAlias: Object.fromEntries(X402.map((m) => [m, stub])) },
  experimental: { optimizePackageImports: ["lucide-react", "motion"] },
  async redirects() {
    return [
      { source: "/overview", destination: "/app", permanent: true },
      { source: "/assets", destination: "/app/assets", permanent: true },
      { source: "/assets/:symbol", destination: "/app/assets/:symbol", permanent: true },
      { source: "/eligibility", destination: "/app/eligibility", permanent: true },
      { source: "/policies", destination: "/app/policies", permanent: true },
      { source: "/events", destination: "/app/events", permanent: true },
      { source: "/corporate-actions", destination: "/app/corporate-actions", permanent: true },
      { source: "/webhooks", destination: "/app/webhooks", permanent: true },
      { source: "/settings", destination: "/app/settings", permanent: true },
      { source: "/api-reference", destination: "/developers/api", permanent: true },
      { source: "/sdk", destination: "/developers/sdk", permanent: true },
    ];
  },
};

export default config;
