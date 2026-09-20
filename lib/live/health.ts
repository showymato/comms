import type { EvidenceSource, ProviderHealth } from "@/types";

export const HEALTH: Record<ProviderHealth, { label: string; text: string; dot: string }> = {
  LIVE: { label: "LIVE", text: "text-eligible", dot: "bg-eligible" },
  LAST_KNOWN: { label: "LAST KNOWN", text: "text-conditional", dot: "bg-conditional" },
  STALE: { label: "STALE", text: "text-ineligible", dot: "bg-ineligible" },
  DEGRADED: { label: "DEGRADED", text: "text-conditional", dot: "bg-conditional" },
  OFFLINE: { label: "OFFLINE", text: "text-ineligible", dot: "bg-ineligible" },
  NOT_CONFIGURED: { label: "NOT CONFIGURED", text: "text-ink-3", dot: "bg-ink-4" },
  CONNECTING: { label: "CONNECTING", text: "text-ink-3", dot: "bg-ink-4" },
  ON_DEMAND: { label: "ON DEMAND", text: "text-ink-3", dot: "bg-ink-4" },
};

/** What each evidence source is, and how far to trust it. Shown when a source badge is opened. */
export const SOURCE_INFO: Record<EvidenceSource, { label: string; kind: string; means: string }> = {
  ONCHAIN: { label: "ONCHAIN", kind: "Robinhood Chain RPC · source of truth", means: "Read directly from the token contract on Robinhood Chain (id 4663), pinned to the block shown." },
  ROBINHOOD: { label: "ROBINHOOD", kind: "Robinhood Stock Token API · primary", means: "Reported by Robinhood's public Stock Token API (assets, prices, corporate actions). Off-chain; not tied to a block." },
  BLOCKSCOUT: { label: "BLOCKSCOUT", kind: "Public explorer · enrichment", means: "Explorer metadata used to enrich contract evidence. Never overrides an onchain read." },
  COINGECKO: { label: "COINGECKO", kind: "Market data · secondary", means: "Optional market-data enrichment. Not authoritative for token contract state." },
  ALPHA_VANTAGE: { label: "ALPHA VANTAGE", kind: "Underlying stock data · optional", means: "Optional underlying-equity market data. Never overrides onchain token state." },
  ORACLE: { label: "ORACLE (DEMO)", kind: "Demo dataset", means: "Value from the built-in demo dataset, not a real oracle." },
  ISSUER: { label: "ISSUER (DEMO)", kind: "Demo dataset", means: "Value from the built-in demo dataset, not a real issuer feed." },
  INDEXER: { label: "INDEXER (DEMO)", kind: "Demo dataset", means: "Value from the built-in demo dataset, not a real indexer." },
  DEMO: { label: "DEMO", kind: "Demo value", means: "COMMS filled this in for demonstration. It is not observed data." },
  NONE: { label: "UNKNOWN", kind: "No source", means: "No source could supply this value, so COMMS reports UNKNOWN instead of guessing." },
};

export const isDemoSource = (s: EvidenceSource) => s === "DEMO" || s === "ORACLE" || s === "ISSUER" || s === "INDEXER";
