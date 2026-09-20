/**
 * CoinGecko Demo API — OPTIONAL secondary market-data source. Key is server-side only (COINGECKO_API_KEY).
 * Not authoritative for Stock Token contract state. Only connectivity is implemented; there is no verified
 * mapping from Robinhood Stock Tokens to CoinGecko ids, so COMMS does not enrich prices from it yet.
 */
import { requestJson, type Timed } from "@/lib/data/request";

export const coingeckoConfigured = () => Boolean(process.env.COINGECKO_API_KEY);

export async function ping(): Promise<Timed<true>> {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) throw new Error("NOT_CONFIGURED");
  const t = await requestJson<{ gecko_says?: string }>("https://api.coingecko.com/api/v3/ping", {
    headers: { "x-cg-demo-api-key": key },
    timeoutMs: 6000,
    retries: 0,
  });
  if (!t.data.gecko_says) throw new Error("Unexpected CoinGecko response");
  return { data: true, latencyMs: t.latencyMs };
}
