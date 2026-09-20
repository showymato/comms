"use client";

import { Star } from "lucide-react";
import { useLocal } from "@/hooks/use-local";
import { toggleWatch, watchlistStore } from "@/lib/workspace";
import { cn } from "@/lib/utils";

/** Adds / removes a token from the LOCAL watchlist (this browser only). */
export function WatchButton({ symbol }: { symbol: string }) {
  const list = useLocal(watchlistStore);
  const on = list.includes(symbol);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => toggleWatch(symbol)}
      title="Saved in this browser only — not synced to any account"
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] transition-colors", on ? "border-ink bg-ink text-on-ink" : "border-line text-ink-2 hover:border-line-2 hover:text-ink")}
    >
      <Star size={12} fill={on ? "currentColor" : "none"} aria-hidden />
      {on ? "Watching" : "Watch"}
    </button>
  );
}
