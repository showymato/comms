/**
 * Alpha Vantage — OPTIONAL underlying-stock market data. Key is server-side only (ALPHA_VANTAGE_API_KEY).
 * Never used to derive onchain token state.
 */
import { requestJson, type Timed } from "@/lib/data/request";

export const alphaVantageConfigured = () => Boolean(process.env.ALPHA_VANTAGE_API_KEY);

export interface UnderlyingQuote {
  symbol: string;
  price: number;
  latestTradingDay: string;
}

export async function getMarketData(symbol: string): Promise<Timed<UnderlyingQuote | null>> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("NOT_CONFIGURED");
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const t = await requestJson<Record<string, unknown>>(url, { timeoutMs: 8000, retries: 0 });
  // Alpha Vantage answers rate limits with HTTP 200 and an "Information"/"Note" string.
  const notice = t.data.Information ?? t.data.Note;
  if (typeof notice === "string") throw new Error(notice.slice(0, 160));
  const q = t.data["Global Quote"] as Record<string, string> | undefined;
  const price = q ? Number(q["05. price"]) : NaN;
  if (!q || !Number.isFinite(price)) return { data: null, latencyMs: t.latencyMs };
  return { data: { symbol, price, latestTradingDay: q["07. latest trading day"] ?? "" }, latencyMs: t.latencyMs };
}

export async function ping(): Promise<Timed<true>> {
  const r = await getMarketData("IBM");
  return { data: true, latencyMs: r.latencyMs };
}
