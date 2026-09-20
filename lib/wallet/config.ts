import { connectorsForWallets, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { coinbaseWallet, injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { RH_BROWSER_RPC, robinhoodChain } from "./chain";

const APP_NAME = "COMMS";

/** WalletConnect needs a project ID from cloud.reown.com. Without one, only injected and Coinbase wallets are offered — and the UI says so. */
export const WALLETCONNECT_PROJECT_ID = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "").trim();
export const HAS_WALLETCONNECT = WALLETCONNECT_PROJECT_ID.length > 0;

const transports = { [robinhoodChain.id]: http(RH_BROWSER_RPC) } as const;

/** SSR-safe: `ssr: true` defers reconnect until after hydration, so server and client markup match. */
export function buildWagmiConfig() {
  if (HAS_WALLETCONNECT) {
    return getDefaultConfig({
      appName: APP_NAME,
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [robinhoodChain],
      transports,
      ssr: true,
    });
  }
  const connectors = connectorsForWallets([{ groupName: "Available", wallets: [injectedWallet, metaMaskWallet, coinbaseWallet] }], {
    appName: APP_NAME,
    // Not used: no WalletConnect-backed wallet is listed. RainbowKit requires the field to be a string.
    projectId: "unconfigured",
  });
  return createConfig({ connectors, chains: [robinhoodChain], transports, ssr: true });
}
