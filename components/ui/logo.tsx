import { cn } from "@/lib/utils";

/**
 * COMMS mark: four signal nodes. One input fans into two independent verifications
 * that converge on a single, filled decision node.
 * Works as white (default), black (`tone="black"`) or with the cyan accent (`tone="accent"`).
 */
export function LogoMark({
  size = 28,
  tone = "white",
  className,
}: {
  size?: number;
  tone?: "white" | "black" | "accent";
  className?: string;
}) {
  const stroke = tone === "black" ? "#05070A" : "#F5F7FA";
  const decision = tone === "accent" ? "#54D6FF" : stroke;
  const hole = tone === "black" ? "#FFFFFF" : "#05070A";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M6.5 16 14 7.5M6.5 16 14 24.5M14 7.5 25.5 16M14 24.5 25.5 16"
        stroke={stroke}
        strokeOpacity={tone === "accent" ? 0.55 : 0.7}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="6.5" cy="16" r="3" fill={hole} stroke={stroke} strokeWidth="1.5" />
      <circle cx="14" cy="7.5" r="2.4" fill={hole} stroke={stroke} strokeWidth="1.5" />
      <circle cx="14" cy="24.5" r="2.4" fill={hole} stroke={stroke} strokeWidth="1.5" />
      <circle cx="25.5" cy="16" r="3.6" fill={decision} />
    </svg>
  );
}

export function Logo({
  tone = "accent",
  size = 26,
  className,
}: {
  tone?: "white" | "black" | "accent";
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", tone === "black" ? "text-[#05070A]" : "text-ink", className)}>
      <LogoMark size={size} tone={tone} />
      <span className="text-[15px] font-semibold tracking-[0.22em]">COMMS</span>
    </span>
  );
}
