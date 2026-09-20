import { defineChain } from "viem";

/**
 * Robinhood Chain — the application network. Read-only from COMMS' side: the wallet is used for identity and
 * workspace, never for transactions, approvals or token-spend permissions.
 *
 * Browser reads (balance, chain id) go straight to the RPC, which allows cross-origin requests.
 * `NEXT_PUBLIC_RH_RPC_URL` may point at a provider endpoint (Alchemy, QuickNode, Chainstack…); because NEXT_PUBLIC_ values
 * ship to the browser, use a domain-restricted key. Server routes use the private `RH_CHAIN_RPC_URL` instead.
 */
export const RH_CHAIN_ID = 4663;
export const RH_PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
export const RH_EXPLORER = "https://robinhoodchain.blockscout.com";

export const RH_BROWSER_RPC = process.env.NEXT_PUBLIC_RH_RPC_URL || RH_PUBLIC_RPC;

export const robinhoodChain = defineChain({
  id: RH_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RH_BROWSER_RPC] } },
  blockExplorers: { default: { name: "Blockscout", url: RH_EXPLORER } },
});

export const explorerAddressUrl = (address: string) => `${RH_EXPLORER}/address/${address}`;
export const explorerTxUrl = (hash: string) => `${RH_EXPLORER}/tx/${hash}`;
export const explorerBlockUrl = (block: number | string) => `${RH_EXPLORER}/block/${block}`;
