"use client";

import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/status";
import { eligibilityService } from "@/lib/services";
import { useStore } from "@/hooks/use-store";
import { formatTimestamp, shortAddress } from "@/lib/format";
import { useAssets } from "@/hooks/use-live";

export function RecentRuns() {
  const runs = useStore(eligibilityService.runs);
  const { assets } = useAssets();
  return (
    <Panel>
      <PanelHeader title="Recent checks" meta={<span className="font-mono">{runs.length} runs</span>} />
      {runs.length === 0 ? <p className="px-4 py-5 font-mono text-[12px] text-ink-3">No checks run yet in this session.</p> : null}
      <ul>
        {runs.map((r) => {
          const known = assets.some((a) => a.address.toLowerCase() === r.address.toLowerCase());
          const inner = (
            <>
              <span className="w-14 font-mono text-[13px] font-medium text-ink">{r.symbol}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[11px] text-ink-3">{shortAddress(r.address, 8, 6)}</span>
                <span className="block font-mono text-[10.5px] text-ink-4">{formatTimestamp(r.timestamp)} · {r.policyId}</span>
              </span>
              <StatusBadge status={r.status} size="sm" />
            </>
          );
          return (
            <li key={r.id} className="border-b border-line last:border-0">
              {known ? (
                <Link href={`/app/assets/${r.address}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink/3">{inner}</Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
