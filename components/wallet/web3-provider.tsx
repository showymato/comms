"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { buildWagmiConfig } from "@/lib/wallet/config";
import { robinhoodChain } from "@/lib/wallet/chain";

const theme = lightTheme({
  accentColor: "#0a0a0a",
  accentColorForeground: "#f5f5f2",
  borderRadius: "small",
  fontStack: "system",
  overlayBlur: "small",
});

export function Web3Provider({ children }: { children: ReactNode }) {
  // created once per browser session; lazy state keeps them stable across re-renders without module-level singletons on the server
  const [config] = useState(buildWagmiConfig);
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } }));
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} initialChain={robinhoodChain} modalSize="compact" appInfo={{ appName: "COMMS", learnMoreUrl: "https://robinhoodchain.blockscout.com" }}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
