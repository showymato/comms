"use client";

import { Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Modal } from "@/components/ui/overlay";
import { json } from "@/data/api-docs";
import { useLocal } from "@/hooks/use-local";
import { formatTimestamp } from "@/lib/format";
import { webhookDeliveriesStore, webhookEndpointsStore, type WebhookDeliveryLocal, type WebhookEndpointLocal } from "@/lib/workspace";
import { cn } from "@/lib/utils";

const EVENTS = ["ELIGIBILITY_CHANGED", "ASSET_STATUS_CHANGED", "TRANSFER_RESTRICTION", "CORPORATE_ACTION", "CONTRACT_EVENT", "ORACLE_CHANGE"];

const host = (u: string) => {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
};

/** Sends ONE real signed test delivery via the COMMS server and records exactly what came back. */
async function deliver(ep: WebhookEndpointLocal, event: string, attempt: number): Promise<WebhookDeliveryLocal> {
  const t0 = performance.now();
  try {
    const res = await fetch("/api/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: ep.url, event, secret: ep.secret ?? undefined }) });
    const body = (await res.json()) as { data: { id: string; sentAt: string; delivered: boolean; response: { status: number | null; latencyMs: number; bodyPreview: string }; error?: string; request: { body: unknown } } | null; meta: { error?: string } };
    if (!body.data) {
      return { id: `dlv_local_${Date.now().toString(36)}`, endpointId: ep.id, event, attempt, sentAt: new Date().toISOString(), delivered: false, status: null, latencyMs: Math.round(performance.now() - t0), error: body.meta.error ?? `COMMS API ${res.status}`, payload: null, responsePreview: "" };
    }
    const d = body.data;
    return { id: d.id, endpointId: ep.id, event, attempt, sentAt: d.sentAt, delivered: d.delivered, status: d.response.status, latencyMs: d.response.latencyMs, error: d.error ?? null, payload: d.request.body, responsePreview: d.response.bodyPreview };
  } catch (e) {
    return { id: `dlv_local_${Date.now().toString(36)}`, endpointId: ep.id, event, attempt, sentAt: new Date().toISOString(), delivered: false, status: null, latencyMs: Math.round(performance.now() - t0), error: e instanceof Error ? e.message : "Request failed", payload: null, responsePreview: "" };
  }
}

const genSecret = () => `whsec_${Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

export function LiveWebhookConsole() {
  const endpoints = useLocal(webhookEndpointsStore);
  const deliveries = useLocal(webhookDeliveriesStore);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const ep = endpoints.find((e) => e.id === selectedId) ?? endpoints[0] ?? null;
  const list = ep ? deliveries.filter((d) => d.endpointId === ep.id) : [];
  const delivery = list.find((d) => d.id === deliveryId) ?? list[0] ?? null;

  async function send(e: WebhookEndpointLocal, event: string, attempt = 1) {
    setBusy(`${e.id}:${event}`);
    const d = await deliver(e, event, attempt);
    webhookDeliveriesStore.set((all) => [d, ...all].slice(0, 60));
    setDeliveryId(d.id);
    setBusy(null);
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <div className="space-y-10">
        <section className="border-t border-ink/80">
          <div className="flex items-center justify-between py-3">
            <h2 className="label !text-ink">Endpoints · local to this browser</h2>
            <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
              <Plus size={14} /> Create endpoint
            </Button>
          </div>
          {endpoints.length === 0 ? (
            <p className="py-8 text-[13.5px] leading-relaxed text-ink-3">No endpoints yet. Create one, then send a real signed test delivery and inspect what your server answered.</p>
          ) : (
            <ul>
              {endpoints.map((e) => (
                <li key={e.id} className={cn("border-t border-line", e.id === ep?.id && "bg-ink/[0.04]")}>
                  <div className="flex flex-wrap items-center gap-3 py-3 pr-1 pl-2">
                    <button type="button" onClick={() => { setSelectedId(e.id); setDeliveryId(null); }} aria-pressed={e.id === ep?.id} className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-mono text-[13px] text-ink">{host(e.url)}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-3">{e.events.length === EVENTS.length ? "All events" : e.events.join(", ")} · {e.secret ? "signed" : "unsigned"}</span>
                    </button>
                    <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void send(e, e.events[0] ?? "ELIGIBILITY_CHANGED")}>
                      <Send size={13} /> {busy?.startsWith(e.id) ? "Sending…" : "Send test"}
                    </Button>
                    <button type="button" aria-label={`Remove ${host(e.url)}`} onClick={() => webhookEndpointsStore.set((all) => all.filter((x) => x.id !== e.id))} className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-ink/5 hover:text-ineligible">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-ink/80">
          <div className="flex items-center justify-between py-3">
            <h2 className="label !text-ink">Deliveries{ep ? ` · ${host(ep.url)}` : ""}</h2>
            <span className="font-mono text-[11px] text-ink-3">{list.length} recorded</span>
          </div>
          {list.length === 0 ? (
            <p className="py-8 text-[13.5px] leading-relaxed text-ink-3">No deliveries. Every row here is a request COMMS actually made to your endpoint — nothing is simulated.</p>
          ) : (
            <ul>
              {list.map((d) => (
                <li key={d.id} className="border-t border-line">
                  <button type="button" onClick={() => setDeliveryId(d.id)} aria-pressed={d.id === delivery?.id} className={cn("grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 px-2 py-2.5 text-left transition-colors sm:grid-cols-[84px_1fr_110px_70px]", d.id === delivery?.id ? "bg-ink/[0.05]" : "hover:bg-ink/[0.03]")}>
                    <span className={cn("font-mono text-[12px] font-medium", d.delivered ? "text-eligible" : "text-ineligible")}>
                      <span aria-hidden>{d.delivered ? "✓" : "✕"} </span>
                      {d.status ?? "NO RESPONSE"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12px] text-ink">{d.event}</span>
                      <span className="block font-mono text-[10.5px] text-ink-3">test · attempt {d.attempt}</span>
                    </span>
                    <span className="hidden text-right font-mono text-[11px] text-ink-3 sm:block">{formatTimestamp(d.sentAt).split(", ")[1]} UTC</span>
                    <span className="tabular text-right font-mono text-[11px] text-ink-3">{d.latencyMs} ms</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start">
        <section className="border-t border-ink/80">
          <div className="flex items-center justify-between py-3">
            <h2 className="label !text-ink">Delivery</h2>
            {delivery ? <span className="font-mono text-[11px] text-ink-3">{delivery.id}</span> : null}
          </div>
          {delivery && ep ? (
            <div>
              <dl className="mb-4 grid grid-cols-3 gap-3 font-mono text-[11.5px]">
                <div><dt className="label">HTTP status</dt><dd className={cn("mt-1", delivery.delivered ? "text-eligible" : "text-ineligible")}>{delivery.status ?? "NONE"}</dd></div>
                <div><dt className="label">Latency</dt><dd className="tabular mt-1 text-ink">{delivery.latencyMs} ms</dd></div>
                <div><dt className="label">Attempt</dt><dd className="mt-1 text-ink">{delivery.attempt}</dd></div>
              </dl>
              <p className="mb-3 font-mono text-[11px] text-ink-3">{delivery.event} · {formatTimestamp(delivery.sentAt)} UTC</p>
              {delivery.error ? <p role="alert" className="mb-3 rounded-md border border-ineligible/25 bg-ineligible/[0.06] px-3 py-2 font-mono text-[12px] text-ineligible">{delivery.error}</p> : null}
              {delivery.payload ? <CodeBlock code={json(delivery.payload)} lang="json" title="POST body sent" /> : null}
              {delivery.responsePreview ? <pre className="mt-3 max-h-40 overflow-auto rounded-md border border-line bg-base-1 p-3 font-mono text-[11.5px] whitespace-pre-wrap text-ink-2">{delivery.responsePreview}</pre> : null}
              {!delivery.delivered ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-ink-3">Not delivered. Retry sends another real request.</span>
                  <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => void send(ep, delivery.event, delivery.attempt + 1)}>
                    <RotateCcw size={13} className={busy ? "animate-spin" : ""} /> Retry
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-[13.5px] text-ink-3">Select a delivery to inspect its payload.</p>
          )}
        </section>
      </div>

      <CreateModal open={creating} onClose={() => setCreating(false)} onCreated={(e) => { setCreating(false); setSelectedId(e.id); }} />
    </div>
  );
}

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (e: WebhookEndpointLocal) => void }) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["ELIGIBILITY_CHANGED"]);
  const [secret, setSecret] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = /^https:\/\/[^\s/$.?#][^\s]*$/i.test(url.trim());
  const error = !url.trim() ? "Enter an HTTPS endpoint URL." : !valid ? "URL must start with https://" : events.length === 0 ? "Select at least one event." : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Webhooks"
      title="Create endpoint"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTouched(true);
              if (error) return;
              const ep: WebhookEndpointLocal = { id: `ep_${Date.now().toString(36)}`, url: url.trim(), events, secret: secret.trim() || null, createdAt: new Date().toISOString() };
              webhookEndpointsStore.set((all) => [ep, ...all]);
              setUrl("");
              setSecret("");
              setTouched(false);
              onCreated(ep);
            }}
          >
            Create endpoint
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div>
          <label htmlFor={`${id}-url`} className="label mb-1.5 block">Endpoint URL</label>
          <input id={`${id}-url`} data-autofocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-protocol.example/hooks/comms" spellCheck={false} aria-invalid={touched && !!error} className="h-10 w-full rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-cyan/60" />
          {touched && error ? <p role="alert" className="mt-1.5 text-xs text-ineligible">{error}</p> : null}
        </div>
        <div>
          <label htmlFor={`${id}-secret`} className="label mb-1.5 block">Signing secret (optional)</label>
          <div className="flex gap-2">
            <input id={`${id}-secret`} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Used for the x-comms-signature HMAC" spellCheck={false} className="h-10 min-w-0 flex-1 rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-cyan/60" />
            <Button variant="secondary" size="sm" className="h-10" onClick={() => setSecret(genSecret())}>Generate</Button>
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-3">Stored in this browser only.</p>
        </div>
        <fieldset>
          <legend className="label mb-2">Events</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {EVENTS.map((t) => {
              const on = events.includes(t);
              return (
                <label key={t} className={cn("flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 font-mono text-[11px] transition-colors", on ? "border-ink bg-ink/[0.05] text-ink" : "border-line text-ink-3 hover:border-line-2")}>
                  <input type="checkbox" checked={on} onChange={() => setEvents((p) => (on ? p.filter((x) => x !== t) : [...p, t]))} className="size-3.5 accent-[var(--color-ink)]" />
                  {t}
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
