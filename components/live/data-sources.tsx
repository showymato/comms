"use client";

import { useEffect, useState } from "react";
import { HealthTag } from "@/components/live/badges";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { CopyButton } from "@/components/ui/code-block";
import { useLive, useNowMs } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { liveManager, sliceHealth } from "@/lib/data/live-manager";
import { formatTimestamp } from "@/lib/format";
import type { ProviderHealth } from "@/types";

interface Row {
  id: string;
  name: string;
  role: string;
  detail: string;
  health: ProviderHealth;
  latencyMs: number | null;
  lastOkAt: number | null;
  error: string | null;
  keyHint: string | null;
  envVar?: string;
}

const Cell = ({ k, children }: { k: string; children: React.ReactNode }) => (
  <div>
    <dt className="label">{k}</dt>
    <dd className="mt-1 font-mono text-[12px] text-ink-2">{children}</dd>
  </div>
);

/**
 * SETTINGS → DATA SOURCES. Health and latency here are those of requests that were actually made.
 * API keys are never entered or stored in the browser: they are server environment variables, and only the last
 * four characters are ever reported back.
 */
export function DataSources() {
  const s = useLive((x) => x);
  const now = useNowMs(1000);
  const [configure, setConfigure] = useState<Row | null>(null);

  useEffect(() => {
    if (DATA_MODE !== "demo") void liveManager().loadOptionalProviders();
  }, []);

  const opt = (id: string) => s.optional.providers.find((p) => p.id === id);
  const t = now || 1;
  const rhHealth = ([sliceHealth(s.registry, "registry", t), sliceHealth(s.prices, "price", t), sliceHealth(s.corporateActions, "registry", t)] as ProviderHealth[]);
  const worst = (["OFFLINE", "STALE", "DEGRADED", "LAST_KNOWN", "CONNECTING", "LIVE"] as ProviderHealth[]).find((h) => rhHealth.includes(h)) ?? "CONNECTING";
  const explorers = Object.values(s.contracts).map((c) => c.explorer).filter(Boolean);
  const explorerOk = explorers.some((e) => e?.status === "ok");
  const explorerErr = explorers.find((e) => e?.status === "unavailable");

  const rows: Row[] = DATA_MODE === "demo" ? [] : [
    { id: "robinhood", name: "Robinhood Stock Token API", role: "PRIMARY · assets, prices, corporate actions", detail: "Public · no key", health: worst, latencyMs: s.prices.latencyMs ?? s.registry.latencyMs, lastOkAt: s.prices.lastOkAt ?? s.registry.lastOkAt, error: s.registry.error ?? s.prices.error ?? s.corporateActions.error, keyHint: null },
    { id: "chain", name: "Robinhood Chain RPC", role: "ONCHAIN SOURCE OF TRUTH · chain id 4663", detail: "Public RPC · server-side, cached", health: sliceHealth(s.chain, "chain", t), latencyMs: s.chain.latencyMs, lastOkAt: s.chain.lastOkAt, error: s.chain.error ?? s.paused.error, keyHint: null },
    { id: "blockscout", name: "Blockscout", role: "ENRICHMENT · contract verification metadata", detail: "Public · optional", health: explorerOk ? "LIVE" : explorerErr ? "DEGRADED" : "ON_DEMAND", latencyMs: null, lastOkAt: null, error: explorerErr && explorerErr.status === "unavailable" ? explorerErr.error : null, keyHint: null },
    ...(["coingecko", "alphavantage"] as const).map((id): Row => {
      const p = opt(id);
      const name = id === "coingecko" ? "CoinGecko (Demo API)" : "Alpha Vantage";
      return {
        id,
        name,
        role: id === "coingecko" ? "SECONDARY · market-data enrichment" : "OPTIONAL · underlying stock data",
        detail: "API key · server-side only",
        health: p ? p.health : s.optional.loaded ? "NOT_CONFIGURED" : "CONNECTING",
        latencyMs: p?.latencyMs ?? null,
        lastOkAt: p?.lastSuccessAt ? Date.parse(p.lastSuccessAt) : null,
        error: p?.lastError ?? (s.optional.error && !p ? s.optional.error : null),
        keyHint: p?.keyHint ?? null,
        envVar: id === "coingecko" ? "COINGECKO_API_KEY" : "ALPHA_VANTAGE_API_KEY",
      };
    }),
  ];

  return (
    <Panel>
      <PanelHeader title="Data sources" meta={<span className="font-mono">{DATA_MODE.toUpperCase()} MODE</span>} />
      {DATA_MODE === "demo" ? (
        <p className="p-4 text-[13.5px] leading-relaxed text-ink-2">
          Demo mode: no provider is connected and nothing on screen is read from a live source. Set <code className="font-mono text-[12px] text-ink">NEXT_PUBLIC_DATA_MODE=live</code> to connect.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] text-ink">{r.name}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] tracking-[0.04em] text-ink-4">{r.role}</div>
                </div>
                <div className="flex items-center gap-3">
                  <HealthTag health={r.health} />
                  {r.envVar ? (
                    <Button size="sm" variant="secondary" onClick={() => setConfigure(r)}>
                      Configure
                    </Button>
                  ) : null}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Cell k="Latency">{r.latencyMs === null ? "—" : `${r.latencyMs} ms`}</Cell>
                <Cell k="Last success">{r.lastOkAt === null ? "—" : `${formatTimestamp(new Date(r.lastOkAt).toISOString())} UTC`}</Cell>
                <Cell k="Access">{r.keyHint ?? r.detail}</Cell>
                <Cell k="Last error">
                  <span className={r.error ? "text-conditional" : undefined}>{r.error ?? "None"}</span>
                </Cell>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <Modal open={configure !== null} onClose={() => setConfigure(null)} title={`Configure ${configure?.name ?? ""}`} eyebrow="Server environment">
        {configure?.envVar ? (
          <div className="space-y-4 p-5 text-[13.5px] leading-relaxed text-ink-2">
            <p>Add the key to your deployment environment (for local development, <code className="font-mono text-[12px] text-ink">.env.local</code>), then restart the server:</p>
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-base-1 px-3 py-2.5 font-mono text-[12.5px] text-ink">
              <span>{configure.envVar}=&lt;your key&gt;</span>
              <CopyButton text={`${configure.envVar}=`} label="Copy variable name" />
            </div>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink-3">
              <li>The key is read only by COMMS API routes and is never sent to the browser.</li>
              <li>Only the last four characters are ever displayed, for example <span className="font-mono">••••••••91A2</span>.</li>
              <li>{configure.id === "coingecko" ? "CoinGecko is secondary enrichment. It never overrides Robinhood or onchain data." : "Alpha Vantage is used for underlying-equity data only. It never overrides onchain token state."}</li>
              <li>Never commit .env files or store keys in localStorage.</li>
            </ul>
          </div>
        ) : null}
      </Modal>
    </Panel>
  );
}
