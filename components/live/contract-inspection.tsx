"use client";

import { RefreshCw } from "lucide-react";
import { FreshnessTag, SourceBadge } from "@/components/live/badges";
import { CopyButton } from "@/components/ui/code-block";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { useLive } from "@/hooks/use-live";
import { CHAIN_ID, CHAIN_NAME, DATA_MODE } from "@/lib/data/config";
import { liveManager } from "@/lib/data/live-manager";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Asset } from "@/types";

function Row({ k, source, at, children }: { k: string; source?: "ONCHAIN" | "BLOCKSCOUT" | "ROBINHOOD"; at?: string | number | null; children: React.ReactNode }) {
  return (
    <div className="border-b border-line px-4 py-2.5 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <dt className="label">{k}</dt>
        {source ? <SourceBadge source={source} at={at} /> : null}
      </div>
      <dd className="mt-1 font-mono text-[12px] [overflow-wrap:anywhere] text-ink">{children}</dd>
    </div>
  );
}

const unknown = <span className="text-unknown">UNKNOWN</span>;

/**
 * Contract inspection: what COMMS could actually read from the token contract, at a pinned block.
 * Verification is claimed only when Blockscout says so; otherwise it is UNKNOWN with the reason.
 */
export function ContractInspection({ asset }: { asset: Asset }) {
  const info = useLive((s) => s.contracts[asset.address.toLowerCase()]);
  const p = info?.probe ?? null;
  const ex = info?.explorer ?? null;
  const live = asset.live;

  if (DATA_MODE === "demo" || !live) {
    return (
      <Panel>
        <PanelHeader title="Contract inspection" />
        <p className="p-4 text-[13px] text-ink-3">
          <span className="font-mono text-conditional">DEMO DATA</span> — demo assets have no real contract to inspect.
        </p>
      </Panel>
    );
  }

  const nameMatches = p?.symbol == null ? null : p.symbol === asset.symbol;
  return (
    <Panel>
      <PanelHeader
        title="Contract inspection"
        meta={
          <>
            <FreshnessTag at={info?.fetchedAt} kind="contract" />
            <button type="button" aria-label="Re-read contract" onClick={() => void liveManager().fetchContract(asset.address, asset.symbol)} className="text-ink-3 hover:text-ink">
              <RefreshCw size={12} className={cn(info?.loading && "animate-spin")} />
            </button>
          </>
        }
      />
      <dl>
        <Row k="Contract">
          <span className="flex items-center gap-2">
            {asset.address}
            <CopyButton text={asset.address} label="Copy address" />
          </span>
        </Row>
        <Row k="Network" source="ROBINHOOD" at={live.registryFetchedAt}>
          {CHAIN_NAME} · chain id {CHAIN_ID}
        </Row>
        {info?.error && !p ? (
          <div className="px-4 py-3 text-[12.5px] text-ink-2">
            <span className="font-mono text-conditional">CHAIN DATA DEGRADED</span> — {info.error}
          </div>
        ) : null}
        <Row k="Block" source="ONCHAIN" at={p?.blockTime}>
          {p ? `${p.block.toLocaleString("en-US")} · ${formatTimestamp(p.blockTime)} UTC` : info?.loading ? "Reading…" : unknown}
        </Row>
        <Row k="Bytecode" source="ONCHAIN" at={p?.blockTime}>
          {p ? (p.hasBytecode ? `PRESENT · ${p.bytecodeBytes.toLocaleString("en-US")} bytes${p.proxyLike ? " · proxy-like (heuristic)" : ""}` : <span className="text-ineligible">NO CODE AT ADDRESS</span>) : unknown}
        </Row>
        <Row k="paused()" source="ONCHAIN" at={p?.blockTime}>
          {p ? (p.paused === null ? <span className="text-unknown">UNKNOWN — not readable</span> : <span className={p.paused ? "text-ineligible" : "text-eligible"}>{String(p.paused).toUpperCase()}</span>) : unknown}
        </Row>
        <Row k="symbol()" source="ONCHAIN" at={p?.blockTime}>
          {p?.symbol ? (
            <>
              {p.symbol} {nameMatches === false ? <span className="text-conditional">≠ registry {asset.symbol}</span> : <span className="text-ink-4">matches registry</span>}
            </>
          ) : (
            unknown
          )}
        </Row>
        <Row k="name()" source="ONCHAIN" at={p?.blockTime}>
          {p?.name ?? unknown}
        </Row>
        <Row k="decimals()" source="ONCHAIN" at={p?.blockTime}>
          {p?.decimals ?? unknown}
          {p?.decimals != null && live.decimals !== null && p.decimals !== live.decimals ? <span className="ml-2 text-conditional">≠ registry {live.decimals}</span> : null}
        </Row>
        <Row k="totalSupply()" source="ONCHAIN" at={p?.blockTime}>
          {p?.totalSupply ? p.totalSupply : unknown}
          {p?.totalSupply && p.decimals != null ? <span className="ml-2 text-ink-4">raw units</span> : null}
        </Row>
        <Row k="Verification" source="BLOCKSCOUT" at={info?.fetchedAt}>
          {ex === null ? (
            unknown
          ) : ex.status === "ok" ? (
            ex.verified ? (
              <span className="text-eligible">VERIFIED{ex.compilerVersion ? ` · ${ex.compilerVersion}` : ""}</span>
            ) : (
              <span className="text-conditional">NOT VERIFIED on Blockscout</span>
            )
          ) : (
            <span className="text-unknown">UNKNOWN — explorer unavailable</span>
          )}
          {ex && ex.status === "unavailable" ? <span className="mt-0.5 block text-[10.5px] text-ink-4">{ex.error}</span> : null}
        </Row>
      </dl>
    </Panel>
  );
}
