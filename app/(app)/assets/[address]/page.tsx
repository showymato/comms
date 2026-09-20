import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetDetail } from "@/components/assets/asset-detail";
import { assetService, eligibilityService } from "@/lib/services";

export const dynamicParams = false;

type Params = { address: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await assetService.list()).map((a) => ({ address: a.address }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { address } = await params;
  const asset = await assetService.get(address);
  return { title: asset ? `${asset.symbol} · ${asset.name}` : "Asset not found" };
}

export default async function AssetPage({ params }: { params: Promise<Params> }) {
  const { address } = await params;
  const asset = await assetService.get(address);
  if (!asset) notFound();
  const history = await eligibilityService.history(asset.address);
  return <AssetDetail asset={asset} history={history} />;
}
