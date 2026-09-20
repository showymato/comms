"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useAccount, useBalance, useSignMessage } from "wagmi";
import { verifyMessage } from "viem";
import { StatusBadge } from "@/components/ui/status";
import { Ago } from "@/components/ui/motion-bits";
import { EventTimeline } from "@/components/live/event-timeline";
import { Identicon, WalletButton } from "@/components/wallet/connect-button";
import { useEvaluated } from "@/hooks/use-evaluated";
import { useLocal } from "@/hooks/use-local";
import { formatTimestamp, shortAddress } from "@/lib/format";
import { tokenEquivalent } from "@/lib/live/evidence";
import { HAS_WALLETCONNECT } from "@/lib/wallet/config";
import { RH_CHAIN_ID, explorerAddressUrl } from "@/lib/wallet/chain";
import { recentChecksStore, savedPoliciesStore, toggleWatch, watchlistStore, webhookEndpointsStore } from "@/lib/workspace";

function Sec({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-ink/80">
      <div className="flex items-center justify-between gap-3 py-3">
        <h2 className="label !text-ink">{title}</h2>
        {meta ? <div className="font-mono text-[11px] text-ink-3">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

const LOCAL = <span title="Stored in this browser only">LOCAL · this browser</span>;
const Empty = ({ children }: { children: ReactNode }) => <p className="pb-6 text-[13.5px] leading-relaxed text-ink-3">{children}</p>;

/** Wallet-scoped workspace. The wallet identifies you; everything saved here lives in this browser, and the page says so. */
export function WorkspaceView() {
  const { address, isConnected, chainId } = useAccount();
  const { data: balance } = useBalance({ address, chainId: RH_CHAIN_ID, query: { enabled: Boolean(address) } });
  const ev = useEvaluated();
  const watch = useLocal(watchlistStore);
  const policies = useLocal(savedPoliciesStore);
  const checks = useLocal(recentChecksStore);
  const endpoints = useLocal(webhookEndpointsStore);
  const [add, setAdd] = useState("");
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const [proof, setProof] = useState<{ at: string; ok: boolean } | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      watch.map((sym) => {
        const i = ev.assets.findIndex((a) => a.symbol === sym);
        return { sym, asset: i >= 0 ? ev.assets[i] : null, result: i >= 0 ? ev.results[i] : null };
      }),
    [watch, ev.assets, ev.results],
  );

  async function prove() {
    if (!address) return;
    setSignError(null);
    const message = `COMMS wallet ownership check\n\nThis signature proves you control ${address}.\nIt is not a transaction, grants no approval and spends nothing.\n\nIssued: ${new Date().toISOString()}\nNonce: ${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
    try {
      const signature = await signMessageAsync({ message });
      const ok = await verifyMessage({ address, message, signature });
      setProof({ at: new Date().toISOString(), ok });
    } catch (e) {
      setSignError(e instanceof Error ? e.message.split("\n")[0] : "Signature request was declined.");
    }
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="pb-10">
        <div className="label flex items-center gap-3">
          <span className="text-ink">COMMS</span>
          <span aria-hidden className="h-px w-8 bg-line-2" />
          <span>Workspace</span>
        </div>
        {isConnected && address ? (
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Identicon address={address} size={56} className="rounded-lg" />
            <div>
              <div className="label !text-eligible">Connected</div>
              <h1 className="display display-md mt-1 font-mono" title={address}>
                {shortAddress(address)}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-ink-3">
                <span>{chainId === RH_CHAIN_ID ? "RH CHAIN · 4663" : `CHAIN ${chainId} · not Robinhood Chain`}</span>
                <span>{balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "BALANCE UNKNOWN"}</span>
                <a href={explorerAddressUrl(address)} target="_blank" rel="noreferrer" className="underline decoration-ink/30 underline-offset-4 hover:text-ink">
                  View on Blockscout
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <h1 className="display display-lg max-w-[14ch] text-ink uppercase">Your workspace</h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-2">Connect a wallet to identify yourself. COMMS is read-only: connecting never requests a transaction, an approval or a token-spend permission.</p>
            <div className="mt-6 flex items-center gap-4">
              <WalletButton />
              <span className="font-mono text-[11px] text-ink-3">NOT CONNECTED</span>
            </div>
          </div>
        )}
        {!HAS_WALLETCONNECT ? (
          <p role="note" className="mt-6 max-w-2xl border-l-2 border-conditional pl-3 text-[12.5px] leading-relaxed text-ink-2">
            <span className="font-mono text-conditional">Wallet connection configuration required.</span> WalletConnect and mobile wallets are disabled until <code className="font-mono text-ink">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is set. Browser wallets (MetaMask, Coinbase Wallet, injected) still work.
          </p>
        ) : null}
        <p className="mt-6 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
          What you save here — watchlist, policies, recent checks and webhook endpoints — is stored <span className="text-ink">locally in this browser</span>. It is not synced to a server account and is not tied to your address.
        </p>
      </header>

      <div className="space-y-10 pb-16">
        <Sec title="Watchlist" meta={LOCAL}>
          <form
            className="flex flex-wrap gap-2 pb-4"
            onSubmit={(e) => {
              e.preventDefault();
              const sym = add.trim().toUpperCase();
              if (sym && ev.assets.some((a) => a.symbol === sym) && !watch.includes(sym)) toggleWatch(sym);
              setAdd("");
            }}
          >
            <label htmlFor="ws-add" className="sr-only">Add asset by symbol</label>
            <input id="ws-add" list="ws-symbols" value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add a symbol, e.g. AAPL" className="h-9 w-56 rounded-md border border-line-2 bg-base-1 px-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-cyan/60" />
            <datalist id="ws-symbols">{ev.assets.map((a) => <option key={a.symbol} value={a.symbol}>{a.name}</option>)}</datalist>
            <button type="submit" className="h-9 rounded-md bg-ink px-4 font-mono text-[11.5px] tracking-[0.08em] text-on-ink uppercase hover:opacity-85">Add</button>
          </form>
          {rows.length === 0 ? (
            <Empty>Nothing watched yet. Add a symbol above, or press Watch on any asset page.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <caption className="sr-only">Watched assets</caption>
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
                    {["Asset", "Status", "Price", "Eligibility", "Updated", ""].map((h) => (
                      <th key={h} scope="col" className="py-2 pr-3 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ sym, asset, result }) => {
                    const p = asset?.live?.price;
                    const eq = p && asset?.live ? tokenEquivalent(p.mid, asset.live.multiplier) : null;
                    return (
                      <tr key={sym} className="border-b border-line">
                        <td className="py-3 pr-3"><Link href={`/app/assets/${sym}`} className="font-medium text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink">{sym}</Link> <span className="text-ink-3">{asset?.name}</span></td>
                        <td className="pr-3 font-mono text-[11.5px]">{asset?.live?.lifecycle ?? "UNKNOWN"}</td>
                        <td className="tabular pr-3 font-mono">{eq === null ? "UNKNOWN" : `$${eq.toFixed(2)}`}</td>
                        <td className="pr-3">{result ? <StatusBadge status={result.status} size="sm" /> : <span className="font-mono text-[11.5px] text-unknown">UNKNOWN</span>}</td>
                        <td className="pr-3 font-mono text-[11.5px] text-ink-3">{asset ? <Ago sec={asset.updatedAgoSec} /> : "—"}</td>
                        <td className="text-right"><button type="button" aria-label={`Remove ${sym}`} onClick={() => toggleWatch(sym)} className="grid size-8 place-items-center rounded-md text-ink-3 hover:bg-ink/5 hover:text-ineligible"><Trash2 size={14} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Sec>

        <Sec title="Saved policies" meta={LOCAL}>
          {policies.length === 0 ? (
            <Empty>No saved policies. Edit one in the <Link href="/app/policies" className="text-ink underline underline-offset-4">policy studio</Link> and save it.</Empty>
          ) : (
            <ul>
              {policies.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3">
                  <span className="font-mono text-[13px] text-ink">{p.name}</span>
                  <span className="font-mono text-[11.5px] text-ink-3">≥ ${p.minLiquidityUsd.toLocaleString("en-US")} · oracle {p.oracleRequired ? "req" : "opt"} · transfer {p.transferRequired ? "req" : "opt"} · redemption {p.redemptionRequired ? "req" : "opt"}</span>
                  <button type="button" aria-label={`Delete ${p.name}`} onClick={() => savedPoliciesStore.set((all) => all.filter((x) => x.id !== p.id))} className="ml-auto grid size-8 place-items-center rounded-md text-ink-3 hover:bg-ink/5 hover:text-ineligible"><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          )}
        </Sec>

        <Sec title="Recent checks" meta={LOCAL}>
          {checks.length === 0 ? (
            <Empty>No checks yet. Run one from <Link href="/app/eligibility" className="text-ink underline underline-offset-4">Eligibility</Link>.</Empty>
          ) : (
            <ul>
              {checks.slice(0, 8).map((c) => (
                <li key={c.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-2.5">
                  <Link href={`/app/assets/${c.symbol}`} className="font-medium text-ink">{c.symbol}</Link>
                  <span className="font-mono text-[11.5px] text-ink-3">{c.policy} · {formatTimestamp(c.at)} UTC</span>
                  <StatusBadge status={c.eligibility} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Sec>

        <Sec title="Recent events" meta="observed this session">
          <EventTimeline limit={5} />
        </Sec>

        <Sec title="Webhook endpoints" meta={LOCAL}>
          {endpoints.length === 0 ? (
            <Empty>No endpoints. Register one on the <Link href="/app/webhooks" className="text-ink underline underline-offset-4">Webhooks</Link> page.</Empty>
          ) : (
            <ul>
              {endpoints.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 border-t border-line py-3 font-mono text-[12px]"><span className="text-ink">{new URL(e.url).host}</span><span className="text-ink-3">{e.events.length} events · {e.secret ? "signed" : "unsigned"}</span></li>
              ))}
            </ul>
          )}
        </Sec>

        <Sec title="API keys" meta="none issued">
          <Empty>The COMMS API is open and needs no key today. When keys are introduced they will be bound to your wallet with an explicit signature — never silently.</Empty>
        </Sec>

        {isConnected && address ? (
          <Sec title="Wallet verification" meta="explicit signature · no transaction">
            <div className="pb-6">
              <p className="max-w-2xl text-[13.5px] leading-relaxed text-ink-2">Connecting a wallet does not authorize anything. For sensitive actions COMMS asks for a signature you can read. This one only proves you control the address; it is verified in your browser and is not a server session.</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="button" onClick={prove} disabled={signing} className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 px-4 font-mono text-[11.5px] tracking-[0.08em] uppercase hover:border-ink disabled:opacity-50"><ShieldCheck size={14} aria-hidden /> {signing ? "Waiting for wallet…" : "Sign to verify"}</button>
                {proof ? <span className={proof.ok ? "font-mono text-[12px] text-eligible" : "font-mono text-[12px] text-ineligible"}>{proof.ok ? "✓ Ownership verified" : "✕ Signature did not match"} · {formatTimestamp(proof.at)} UTC</span> : null}
                {signError ? <span role="alert" className="font-mono text-[12px] text-conditional">{signError}</span> : null}
              </div>
            </div>
          </Sec>
        ) : null}
      </div>
    </div>
  );
}
