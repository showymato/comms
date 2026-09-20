const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => n.toString().padStart(2, "0");

/** "20 Sep 2026, 21:03:42" — always UTC so server and client agree. */
export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

/** "21:03:42" (UTC) */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`;
}

export function formatAgo(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export function formatUsd(n: number | null, opts: { compact?: boolean } = {}): string {
  if (n === null) return "—";
  if (opts.compact) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, "")}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  }
  return `$${n.toLocaleString("en-US")}`;
}

export function shortAddress(addr: string, head = 6, tail = 4): string {
  return addr.length <= head + tail + 1 ? addr : `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export const isAddress = (v: string) => /^0x[0-9a-fA-F]{40}$/.test(v.trim());
