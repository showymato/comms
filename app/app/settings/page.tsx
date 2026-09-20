import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DataSources } from "@/components/live/data-sources";
import { ModeBadge } from "@/components/live/badges";
import { DATA_MODE } from "@/lib/data/config";
import { HAS_WALLETCONNECT } from "@/lib/wallet/config";
import { RH_BROWSER_RPC, RH_CHAIN_ID, RH_EXPLORER } from "@/lib/wallet/chain";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink/80">
      <h2 className="label !text-ink py-3">{title}</h2>
      {children}
    </section>
  );
}

const MODES = [
  ["live", "LIVE", "Robinhood registry, prices and corporate actions plus Robinhood Chain reads. Anything COMMS cannot verify is UNKNOWN."],
  ["hybrid", "HYBRID", "Live data. Checks that no live source can supply are filled with values badged DEMO."],
  ["demo", "DEMO", "The built-in simulated dataset. Labelled DEMO ENVIRONMENT everywhere; no network calls."],
] as const;

function Row({ k, v, tone }: { k: string; v: ReactNode; tone?: "ok" | "warn" }) {
  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-4 border-t border-line py-3 text-[13.5px]">
      <dt className="text-ink-3">{k}</dt>
      <dd className={cn("font-mono text-[12.5px] break-all", tone === "warn" ? "text-conditional" : "text-ink")}>{v}</dd>
    </div>
  );
}

export default function SettingsPage() {
  const host = (() => {
    try {
      return new URL(RH_BROWSER_RPC).host;
    } catch {
      return "custom";
    }
  })();
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader title="Settings" description="Data sources, network, wallet configuration and data mode." actions={<ModeBadge />} />

      <Sec title="Data sources">
        <DataSources />
      </Sec>

      <Sec title="Network">
        <dl>
          <Row k="Application network" v={`Robinhood Chain · chain id ${RH_CHAIN_ID}`} />
          <Row k="Browser RPC" v={host === "rpc.mainnet.chain.robinhood.com" ? `${host} (public)` : `${host} (custom provider)`} />
          <Row k="Explorer" v={RH_EXPLORER.replace("https://", "")} />
          <Row k="Server RPC" v="ROBINHOOD_RPC_URL — private, server-side (public RPC when unset)" />
        </dl>
      </Sec>

      <Sec title="Wallet">
        <dl>
          <Row k="Library" v="RainbowKit · wagmi · viem" />
          <Row k="WalletConnect" v={HAS_WALLETCONNECT ? "Configured" : "Wallet connection configuration required — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"} tone={HAS_WALLETCONNECT ? "ok" : "warn"} />
          <Row k="Permissions" v="Read-only. No transactions, approvals or token-spend requests." />
        </dl>
      </Sec>

      <Sec title="Data mode · developer setting">
        <div className="pb-2">
          <ul className="grid gap-2 sm:grid-cols-3" aria-label="Data modes">
            {MODES.map(([id, label, body]) => (
              <li key={id} className={cn("rounded-md border p-3.5", DATA_MODE === id ? "border-ink bg-ink/[0.04]" : "border-line opacity-70")}>
                <div className="flex items-center justify-between font-mono text-[11.5px] tracking-[0.08em] text-ink">
                  {label}
                  {DATA_MODE === id ? <span className="text-eligible">ACTIVE</span> : null}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-ink-3">
            The mode is fixed per deployment so a visitor can never be shown demo values by accident. Switch it with <code className="font-mono text-ink">NEXT_PUBLIC_DATA_MODE=live|hybrid|demo</code> in <code className="font-mono text-ink">.env.local</code> and restart. In demo the whole interface shows DEMO ENVIRONMENT; in live it shows LIVE DATA.
          </p>
        </div>
      </Sec>
    </div>
  );
}
