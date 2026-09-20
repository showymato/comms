"use client";

import { LiveRequest } from "@/components/api/live-request";
import { useAssets } from "@/hooks/use-live";

/** Step 2 of the quickstart: a real check against a real registry token. */
export function QuickstartAssets() {
  const { assets } = useAssets();
  const a = assets.find((x) => x.symbol === "AAPL") ?? assets[0];
  return <LiveRequest key={a?.address ?? "loading"} request={{ method: "POST", path: "/api/eligibility/check", body: { asset: a?.address ?? "0x…", policy: "DEFAULT" } }} />;
}
