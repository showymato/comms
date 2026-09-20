import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { CommandPaletteProvider } from "@/components/dashboard/command-palette";
import { LiveRuntime } from "@/components/live/live-runtime";
import { MotionProvider } from "@/components/ui/motion-bits";
import { Web3Provider } from "@/components/wallet/web3-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "COMMS — The collateral eligibility layer for tokenized stocks", template: "%s · COMMS" },
  description:
    "COMMS is the collateral eligibility layer for tokenized stocks. Deterministic decisions — ELIGIBLE, INELIGIBLE, CONDITIONAL or UNKNOWN — with every reason and every piece of evidence.",
  applicationName: "COMMS",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#F5F5F2",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a
          href="#main"
          className="fixed left-3 top-3 z-[100] -translate-y-16 rounded-md bg-ink px-3 py-2 text-sm font-medium text-on-ink focus:translate-y-0"
        >
          Skip to content
        </a>
        <Web3Provider>
          <MotionProvider>
            <CommandPaletteProvider>
              <LiveRuntime />
              {children}
            </CommandPaletteProvider>
          </MotionProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
