"use client";

import { Plus, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import type { EventType, WebhookDelivery, WebhookEndpoint } from "@/types";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { Ago } from "@/components/ui/motion-bits";
import { Modal } from "@/components/ui/overlay";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { LiveDot } from "@/components/ui/status";
import { json } from "@/data/api-docs";
import { webhookService } from "@/lib/services";
import { useStore } from "@/hooks/use-store";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL_EVENTS: EventType[] = ["ELIGIBILITY_CHANGED", "ASSET_PAUSED", "ORACLE_UNAVAILABLE", "TRANSFER_RESTRICTED", "ASSET_REDEEMED", "ASSET_REACTIVATED"];

const HOST = (u: string) => {
  try {
    return new URL(u).host;
  } catch {
    return u;
  }
};

const STATUS_STYLE: Record<WebhookEndpoint["status"], { text: string; label: string; glyph: string }> = {
  ACTIVE: { text: "text-eligible", label: "ACTIVE", glyph: "●" },
  FAILING: { text: "text-ineligible", label: "FAILING", glyph: "✕" },
  PAUSED: { text: "text-conditional", label: "PAUSED", glyph: "‖" },
};

export function WebhookConsole() {
  const endpoints = useStore(webhookService.endpoints);
  const allDeliveries = useStore(webhookService.deliveries);
  const [selectedId, setSelectedId] = useState(endpoints[0].id);
  const [deliveryId, setDeliveryId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const ep = endpoints.find((e) => e.id === selectedId) ?? endpoints[0];
  const deliveries = allDeliveries[ep.id] ?? [];
  const delivery: WebhookDelivery | undefined = deliveries.find((d) => d.id === deliveryId) ?? deliveries[0];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
      <div className="space-y-4">
        <Panel className="overflow-hidden">
          <PanelHeader
            title="Endpoints"
            meta={
              <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                <Plus size={14} /> Create endpoint
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <caption className="sr-only">Webhook endpoints</caption>
              <thead>
                <tr className="border-b border-line text-left">
                  {["Endpoint", "Status", "Events", "Last delivery", "Success"].map((h) => (
                    <th key={h} scope="col" className="label px-3 py-2.5 font-normal whitespace-nowrap first:pl-4 last:pr-4 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {endpoints.map((e) => {
                  const st = STATUS_STYLE[e.status];
                  const active = e.id === ep.id;
                  return (
                    <tr
                      key={e.id}
                      tabIndex={0}
                      aria-selected={active}
                      onClick={() => {
                        setSelectedId(e.id);
                        setDeliveryId(null);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          setSelectedId(e.id);
                          setDeliveryId(null);
                        }
                      }}
                      className={cn("cursor-pointer border-b border-line transition-colors last:border-0", active ? "bg-ink/[0.06]" : "hover:bg-ink/3")}
                    >
                      <td className="max-w-[240px] py-3 pr-3 pl-4">
                        <span className="block truncate font-mono text-[12.5px] text-ink">{HOST(e.url)}</span>
                        <span className="block truncate font-mono text-[11px] text-ink-4">{new URL(e.url).pathname}</span>
                      </td>
                      <td className={cn("px-3 font-mono text-[11.5px] tracking-[0.06em] whitespace-nowrap", st.text)}>
                        <span aria-hidden>{st.glyph} </span>
                        {st.label}
                      </td>
                      <td className="px-3 font-mono text-[11.5px] whitespace-nowrap text-ink-2">{e.events.length === ALL_EVENTS.length ? "All events" : `${e.events.length} event${e.events.length > 1 ? "s" : ""}`}</td>
                      <td className="px-3 font-mono text-[11.5px] whitespace-nowrap text-ink-3">{(allDeliveries[e.id]?.length ?? 0) === 0 ? "—" : <Ago sec={e.lastDeliveryAgoSec} />}</td>
                      <td className={cn("py-3 pr-4 pl-3 text-right font-mono text-[12px] tabular", e.successRate >= 99 ? "text-ink" : e.successRate >= 90 ? "text-conditional" : "text-ineligible")}>{e.successRate.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={`Deliveries · ${HOST(ep.url)}`} meta={<span className="font-mono">{deliveries.length} recent</span>} />
          {deliveries.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-ink-3">No deliveries yet. Events matching this endpoint&apos;s subscriptions will appear here.</p>
          ) : (
            <ul>
              {deliveries.map((d) => {
                const ok = d.httpStatus >= 200 && d.httpStatus < 300;
                const active = d.id === delivery?.id;
                return (
                  <li key={d.id} className="border-b border-line last:border-0">
                    <button type="button" onClick={() => setDeliveryId(d.id)} aria-pressed={active} className={cn("grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-4 px-4 py-2.5 text-left transition-colors sm:grid-cols-[64px_1fr_120px_70px]", active ? "bg-ink/[0.06]" : "hover:bg-ink/3")}>
                      <span className={cn("font-mono text-[12px] font-medium", ok ? "text-eligible" : "text-ineligible")}>
                        <span aria-hidden>{ok ? "✓" : "✕"} </span>
                        {d.httpStatus}
                        <span className="sr-only">{ok ? " delivered" : " failed"}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[12px] text-ink">{d.event}</span>
                        <span className="block font-mono text-[10.5px] text-ink-4">{d.payload.symbol} · attempt {d.attempt}</span>
                      </span>
                      <span className="hidden text-right font-mono text-[11px] text-ink-3 sm:block">{formatTimestamp(d.timestamp).split(", ")[1]}</span>
                      <span className="text-right font-mono text-[11px] text-ink-3 tabular">{d.durationMs} ms</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* payload viewer */}
      <div className="xl:sticky xl:top-20 xl:self-start">
        <Panel>
          <PanelHeader title="Payload" meta={delivery ? <span className="font-mono">{delivery.id}</span> : null} />
          <div className="p-4">
            <AnimatePresence mode="wait">
              {delivery ? (
                <motion.div key={delivery.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <dl className="mb-4 grid grid-cols-3 gap-3 font-mono text-[11.5px]">
                    <div><dt className="label">Status</dt><dd className={cn("mt-1", delivery.httpStatus < 300 ? "text-eligible" : "text-ineligible")}>{delivery.httpStatus < 300 ? "✓" : "✕"} {delivery.httpStatus}</dd></div>
                    <div><dt className="label">Duration</dt><dd className="mt-1 text-ink">{delivery.durationMs} ms</dd></div>
                    <div><dt className="label">Attempt</dt><dd className="mt-1 text-ink">{delivery.attempt}</dd></div>
                  </dl>
                  <CodeBlock code={json(delivery.payload)} lang="json" title="POST body" />
                  {delivery.httpStatus >= 300 ? (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-ineligible/25 bg-ineligible/[0.06] px-3 py-2.5">
                      <span className="text-[12.5px] text-ink-2">Delivery failed after {delivery.attempt} attempts.</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={retrying === delivery.id}
                        onClick={async () => {
                          setRetrying(delivery.id);
                          await webhookService.retry(ep.id, delivery.id);
                          setRetrying(null);
                        }}
                      >
                        <RotateCcw size={13} className={retrying === delivery.id ? "animate-spin" : ""} /> {retrying === delivery.id ? "Retrying…" : "Retry"}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-4 flex items-center gap-2 font-mono text-[11.5px] text-ink-3"><LiveDot /> Delivered · {formatTimestamp(delivery.timestamp)}</p>
                  )}
                </motion.div>
              ) : (
                <p className="py-10 text-center text-[13px] text-ink-3">Select a delivery to inspect its payload.</p>
              )}
            </AnimatePresence>
          </div>
        </Panel>
      </div>

      <CreateEndpointModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(e) => {
          setCreating(false);
          setSelectedId(e.id);
        }}
      />
    </div>
  );
}

function CreateEndpointModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (e: WebhookEndpoint) => void }) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<EventType[]>(["ELIGIBILITY_CHANGED"]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const validUrl = /^https:\/\/[^\s/$.?#][^\s]*$/i.test(url.trim());
  const error = !url.trim() ? "Enter an HTTPS endpoint URL." : !validUrl ? "URL must start with https://" : events.length === 0 ? "Select at least one event." : null;

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
            disabled={busy}
            onClick={async () => {
              setTouched(true);
              if (error) return;
              setBusy(true);
              const ep = await webhookService.create({ url: url.trim(), events });
              setBusy(false);
              setUrl("");
              setTouched(false);
              onCreated(ep);
            }}
          >
            {busy ? "Creating…" : "Create endpoint"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div>
          <label htmlFor={`${id}-url`} className="label mb-1.5 block">Endpoint URL</label>
          <input
            id={`${id}-url`}
            data-autofocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-protocol.example/hooks/comms"
            spellCheck={false}
            aria-invalid={touched && !!error}
            className="h-10 w-full rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-cyan/60"
          />
          {touched && error ? <p role="alert" className="mt-1.5 text-xs text-ineligible">{error}</p> : null}
        </div>
        <fieldset>
          <legend className="label mb-2">Events</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {ALL_EVENTS.map((t) => {
              const on = events.includes(t);
              return (
                <label key={t} className={cn("flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 font-mono text-[11px] transition-colors", on ? "border-cyan/40 bg-cyan/8 text-ink" : "border-line text-ink-3 hover:border-line-2")}>
                  <input type="checkbox" checked={on} onChange={() => setEvents((p) => (on ? p.filter((x) => x !== t) : [...p, t]))} className="size-3.5 accent-[#54D6FF]" />
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
