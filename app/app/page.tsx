import type { Metadata } from "next";
import { OverviewLive } from "@/components/dashboard/overview-live";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return <OverviewLive />;
}
