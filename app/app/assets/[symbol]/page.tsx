import type { Metadata } from "next";
import { AssetDetailView } from "@/components/assets/asset-detail-view";

export const metadata: Metadata = { title: "Asset" };

type Params = { symbol: string };

/** Assets are resolved client-side from the live registry, so any registry address or symbol works — nothing is pre-rendered from a fixed list. */
export default async function AssetPage({ params }: { params: Promise<Params> }) {
  const { symbol } = await params;
  return <AssetDetailView address={decodeURIComponent(symbol)} />;
}
