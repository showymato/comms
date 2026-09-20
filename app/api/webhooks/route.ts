import { createHmac, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { fail } from "@/lib/providers/serve";

export const runtime = "nodejs";

export const WEBHOOK_EVENTS = ["ELIGIBILITY_CHANGED", "ASSET_STATUS_CHANGED", "TRANSFER_RESTRICTION", "CORPORATE_ACTION", "CONTRACT_EVENT", "ORACLE_CHANGE"] as const;

/** GET /api/webhooks — what the webhook infrastructure can and cannot do today. */
export function GET() {
  return NextResponse.json({
    data: {
      events: WEBHOOK_EVENTS,
      testDelivery: true,
      persistentEndpoints: false,
      scheduledDelivery: false,
      note: "COMMS can send an on-demand signed test delivery to an https endpoint and report the real HTTP result. It does not yet store endpoints or push events on its own; endpoints are kept in your browser.",
    },
    meta: { provider: "comms", fetchedAt: new Date().toISOString() },
  });
}

/* ── SSRF guard: only public https hosts ── */
function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const l = ip.toLowerCase();
    return l === "::1" || l === "::" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe8") || l.startsWith("fe9") || l.startsWith("fea") || l.startsWith("feb") || l.startsWith("::ffff:127.") || l.startsWith("::ffff:10.") || l.startsWith("::ffff:192.168.") || l.startsWith("::ffff:169.254.");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function assertPublicHttps(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Endpoint must be a valid URL.");
  }
  if (u.protocol !== "https:") throw new Error("Endpoint must use https.");
  if (u.username || u.password) throw new Error("Credentials in the URL are not allowed.");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Endpoint must be a public host.");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new Error("Endpoint host did not resolve.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("Endpoint resolves to a private address.");
  return u;
}

/* crude per-instance limiter: 10 test deliveries / minute / client */
const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(key, list);
  return list.length > 10;
}

/**
 * POST /api/webhooks  { url, event?, secret? }
 * Sends ONE real, signed test delivery (`webhook.test`) to the endpoint and returns what actually happened: HTTP status, latency, the
 * request that was sent and a preview of the response. If the request fails, the failure is reported as it is — no status is invented.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return fail("comms", 429, "Too many test deliveries. Try again in a minute.");
  let body: { url?: unknown; event?: unknown; secret?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("comms", 400, "Body must be JSON.");
  }
  if (typeof body.url !== "string") return fail("comms", 400, '"url" is required.');
  const event = typeof body.event === "string" && (WEBHOOK_EVENTS as readonly string[]).includes(body.event) ? body.event : "ELIGIBILITY_CHANGED";
  const secret = typeof body.secret === "string" && body.secret.length > 0 ? body.secret.slice(0, 200) : null;

  let url: URL;
  try {
    url = await assertPublicHttps(body.url);
  } catch (e) {
    return fail("comms", 400, e instanceof Error ? e.message : "Invalid endpoint.");
  }

  const id = `dlv_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const sentAt = new Date().toISOString();
  const payload = JSON.stringify({
    id,
    type: "webhook.test",
    event,
    createdAt: sentAt,
    note: "Test delivery from COMMS. This is not a real eligibility change.",
    data: null,
  });
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "COMMS-Webhooks/1", "x-comms-delivery": id, "x-comms-event": event };
  if (secret) headers["x-comms-signature"] = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  const t0 = performance.now();
  try {
    const res = await fetch(url, { method: "POST", headers, body: payload, redirect: "manual", signal: AbortSignal.timeout(8000) });
    const latencyMs = Math.round(performance.now() - t0);
    const text = (await res.text().catch(() => "")).slice(0, 500);
    return NextResponse.json(
      {
        data: { id, url: url.origin + url.pathname, event, attempt: 1, sentAt, delivered: res.status >= 200 && res.status < 300, response: { status: res.status, latencyMs, bodyPreview: text }, request: { headers: { ...headers, "x-comms-signature": headers["x-comms-signature"] ? "sha256=…" : undefined }, body: JSON.parse(payload) }, signed: Boolean(secret) },
        meta: { provider: "comms", fetchedAt: new Date().toISOString() },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const latencyMs = Math.round(performance.now() - t0);
    return NextResponse.json(
      {
        data: { id, url: url.origin + url.pathname, event, attempt: 1, sentAt, delivered: false, response: { status: null, latencyMs, bodyPreview: "" }, error: e instanceof Error ? e.message : "Request failed", request: { body: JSON.parse(payload) }, signed: Boolean(secret) },
        meta: { provider: "comms", fetchedAt: new Date().toISOString() },
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}
