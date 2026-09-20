"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AlertTriangle, ArrowLeftRight, Check, ChevronDown, Copy, ExternalLink, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useDisconnect, useSwitchChain } from "wagmi";
import { Popover } from "@/components/ui/popover";
import { explorerAddressUrl, RH_CHAIN_ID } from "@/lib/wallet/chain";
import { HAS_WALLETCONNECT } from "@/lib/wallet/config";
import { cn } from "@/lib/utils";

/** Deterministic 5×5 mirrored identicon from the address — no network request, no avatar service. */
export function Identicon({ address, size = 22, className }: { address: string; size?: number; className?: string }) {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const hue = parseInt(hex.slice(0, 4), 16) % 360;
  const cells: boolean[] = [];
  for (let i = 0; i < 15; i++) cells.push(parseInt(hex[4 + i], 16) % 2 === 0);
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const cx = x < 3 ? x : 4 - x;
      if (cells[y * 3 + cx]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" aria-hidden className={cn("shrink-0 rounded-[5px]", className)} style={{ background: `hsl(${hue} 40% 92%)` }} fill={`hsl(${hue} 60% 32%)`} shapeRendering="crispEdges">
      {rects}
    </svg>
  );
}

const shorten = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const BTN = "inline-flex h-9 items-center gap-2 rounded-md px-3.5 font-mono text-[11.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase transition-[background-color,box-shadow] duration-150 active:translate-y-px";

/**
 * COMMS wallet button — built on RainbowKit's ConnectButton.Custom so wallet discovery, WalletConnect sessions and
 * chain switching stay RainbowKit's. Identity only: nothing here requests a signature, approval or transaction.
 */
export function WalletButton({ className }: { className?: string }) {
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const [copied, setCopied] = useState(false);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openChainModal, connectModalOpen, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) return <span aria-hidden className={cn(BTN, "invisible bg-ink text-on-ink", className)}>Connect wallet</span>;

        if (!connected) {
          return (
            <span className="flex items-center gap-2">
              {!HAS_WALLETCONNECT && connectModalOpen
                ? createPortal(
                    <span role="status" className="fixed inset-x-4 bottom-6 z-[2147483647] mx-auto max-w-md rounded-md border border-conditional/50 bg-white px-4 py-3 text-center text-[12.5px] leading-relaxed text-[#0a0a0a] shadow-float">
                      <span className="font-mono text-conditional">Wallet connection configuration required.</span> WalletConnect and mobile wallets are disabled until <code className="font-mono">NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID</code> is set. Browser wallets still work.
                    </span>,
                    document.body,
                  )
                : null}
              {!HAS_WALLETCONNECT ? (
                <span
                  className="hidden size-2 rounded-full bg-conditional xl:block"
                  role="img"
                  aria-label="Wallet connection configuration required: set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to enable WalletConnect and mobile wallets."
                  title="Wallet connection configuration required — WalletConnect is not configured. Browser wallets still work."
                />
              ) : null}
              <button type="button" onClick={openConnectModal} className={cn(BTN, "bg-ink text-on-ink hover:bg-ink/85", className)}>
                Connect wallet
              </button>
            </span>
          );
        }

        if (chain.unsupported || chain.id !== RH_CHAIN_ID) {
          return (
            <button
              type="button"
              onClick={() => switchChain({ chainId: RH_CHAIN_ID }, { onError: () => openChainModal() })}
              disabled={switching}
              aria-label="Wrong network. Switch to Robinhood Chain"
              className={cn(BTN, "border border-conditional/50 bg-conditional/10 text-conditional hover:bg-conditional/15", className)}
              title={switchError ? switchError.message : "Your wallet is on a different network"}
            >
              <AlertTriangle size={13} aria-hidden />
              <span>Wrong network</span>
              <span className="hidden text-ink lg:inline">· Switch to Robinhood Chain</span>
            </button>
          );
        }

        const address = account.address;
        return (
          <Popover
            label="Wallet account"
            triggerClassName={cn("flex h-9 items-center gap-2 rounded-md border border-line-2 bg-surface pr-2 pl-1.5 transition-colors hover:border-ink/40", className)}
            trigger={
              <>
                {account.ensAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.ensAvatar} alt="" width={22} height={22} className="size-[22px] rounded-[5px]" />
                ) : (
                  <Identicon address={address} />
                )}
                <span className="font-mono text-[12px] text-ink">{account.displayName.startsWith("0x") ? shorten(address) : account.displayName}</span>
                {account.displayBalance ? <span className="hidden font-mono text-[11px] text-ink-3 lg:inline">{account.displayBalance}</span> : null}
                <ChevronDown size={12} className="text-ink-3" aria-hidden />
              </>
            }
            panelClassName="w-[300px] p-0"
          >
            {(close) => (
              <div>
                <div className="flex items-center gap-3 border-b border-line p-3.5">
                  {account.ensAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={account.ensAvatar} alt="" width={36} height={36} className="size-9 rounded-md" />
                  ) : (
                    <Identicon address={address} size={36} />
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[13px] text-ink">{shorten(address)}</div>
                    <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-3">
                      <span aria-hidden className="size-1.5 rounded-full bg-eligible" />
                      {chain.name ?? "Robinhood Chain"} · {chain.id}
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 border-b border-line text-[12px]">
                  <div className="border-r border-line p-3">
                    <dt className="label">Balance</dt>
                    <dd className="mt-1 font-mono text-ink">{account.displayBalance ?? "UNKNOWN"}</dd>
                  </div>
                  <div className="p-3">
                    <dt className="label">Network</dt>
                    <dd className="mt-1 font-mono text-ink">RH CHAIN</dd>
                  </div>
                </dl>
                <ul className="p-1.5 text-[13px]">
                  <li>
                    <Link href="/app/workspace" onClick={close} className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-ink-2 hover:bg-ink/5 hover:text-ink">
                      <User size={14} aria-hidden /> Account &amp; workspace
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ink-2 hover:bg-ink/5 hover:text-ink"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(address);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1400);
                        } catch {
                          /* clipboard unavailable: leave the state unchanged */
                        }
                      }}
                    >
                      {copied ? <Check size={14} className="text-eligible" aria-hidden /> : <Copy size={14} aria-hidden />}
                      <span aria-live="polite">{copied ? "Address copied" : "Copy address"}</span>
                    </button>
                  </li>
                  <li>
                    <a href={explorerAddressUrl(address)} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-ink-2 hover:bg-ink/5 hover:text-ink">
                      <ExternalLink size={14} aria-hidden /> View on explorer
                    </a>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        openChainModal();
                      }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ink-2 hover:bg-ink/5 hover:text-ink"
                    >
                      <ArrowLeftRight size={14} aria-hidden /> Switch network
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        disconnect();
                      }}
                      className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-ineligible hover:bg-ineligible/8"
                    >
                      <LogOut size={14} aria-hidden /> Disconnect
                    </button>
                  </li>
                </ul>
                <p className="border-t border-line px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-3">Read-only. COMMS never requests transactions, approvals or token spending.</p>
              </div>
            )}
          </Popover>
        );
      }}
    </ConnectButton.Custom>
  );
}
