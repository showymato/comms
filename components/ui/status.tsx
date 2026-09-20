import type { CheckResult, EligibilityStatus } from "@/types";
import { CHECK_STATUS, STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Glyphs carry meaning independent of colour: ✓ ✕ ◐ ? */
export function StatusGlyph({ status, size = 14, className }: { status: EligibilityStatus; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 20 20", fill: "none", "aria-hidden": true, className: cn("shrink-0", className) } as const;
  const s = { stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (status) {
    case "ELIGIBLE":
      return (
        <svg {...common}>
          <path d="M4 10.5 8.2 14.5 16 5.5" {...s} />
        </svg>
      );
    case "INELIGIBLE":
      return (
        <svg {...common}>
          <path d="M5 5l10 10M15 5 5 15" {...s} />
        </svg>
      );
    case "CONDITIONAL":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.6" {...s} strokeWidth={1.8} />
          <path d="M10 3.4a6.6 6.6 0 0 1 0 13.2z" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.6" {...s} strokeWidth={1.6} strokeDasharray="2.2 2.6" />
          <path d="M8.2 8.2a1.9 1.9 0 1 1 2.7 1.7c-.6.3-.9.7-.9 1.3M10 13.8v.01" {...s} strokeWidth={1.8} />
        </svg>
      );
  }
}

const SIZES = {
  sm: "h-6 px-2 text-[10px] gap-1.5",
  md: "h-7 px-2.5 text-[11px] gap-1.5",
  lg: "h-9 px-3.5 text-xs gap-2",
} as const;

export function StatusBadge({
  status,
  size = "md",
  className,
}: {
  status: EligibilityStatus;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const m = STATUS[status];
  return (
    <span
      title={m.sr}
      className={cn(
        "inline-flex items-center rounded-md border font-mono font-medium tracking-[0.08em] whitespace-nowrap",
        SIZES[size],
        m.text,
        m.bg,
        m.border,
        className,
      )}
    >
      <StatusGlyph status={status} size={size === "lg" ? 15 : 12} />
      {m.label}
      <span className="sr-only">. {m.sr}</span>
    </span>
  );
}

/** Soft pulsing operational dot. */
export function LiveDot({ status = "ELIGIBLE", className }: { status?: EligibilityStatus; className?: string }) {
  const m = STATUS[status];
  return (
    <span aria-hidden className={cn("relative inline-block size-1.5 rounded-full", m.dot, m.text, className)}>
      <span className="absolute inset-0 rounded-full animate-pulse-ring" />
    </span>
  );
}

const RESULT_TEXT: Record<CheckResult, string> = { PASS: "PASS", FAIL: "FAIL", UNKNOWN: "UNKNOWN" };

/** Compact per-check result: glyph + word. `text` overrides the word (e.g. NO / NONE / YES). */
export function ResultTag({ result, text, className }: { result: CheckResult; text?: string; className?: string }) {
  const status = CHECK_STATUS[result];
  const m = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.08em] whitespace-nowrap", m.text, className)}>
      <StatusGlyph status={status} size={13} />
      {text ?? RESULT_TEXT[result]}
      <span className="sr-only">{result === "PASS" ? " (passed)" : result === "FAIL" ? " (failed)" : " (no evidence)"}</span>
    </span>
  );
}
