"use client";

import { motion } from "motion/react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The COMMS visual identity: Stock Token → Asset State → Eligibility Engine → Policy → Decision.
 * SVG spine + ring (9 segments = 9 checks). Particles use SMIL motion paths: no JS, no canvas, GPU-cheap.
 * Nodes are real buttons that expand on hover / focus / tap to reveal their state.
 */

const W = 560;
const H = 760;
const CX = 280;
const CY = 390;
const R = 92;

const polar = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};

const SEGMENTS = Array.from({ length: 9 }, (_, i) => {
  const a0 = -90 + i * 40 + 4;
  const a1 = a0 + 32;
  const [x0, y0] = polar(a0);
  const [x1, y1] = polar(a1);
  return { d: `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`, delay: `${(i * 0.3).toFixed(1)}s` };
});

const FAN = [-128, -106, -74, -52].map((deg, i) => {
  const sx = [212, 250, 310, 348][i];
  const [tx, ty] = polar(deg, R + 6);
  return `M${sx} 152 C${sx} 226 ${tx} ${ty - 70} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
});

const SPINE = [
  "M280 74 L280 96",
  "M280 490 L280 548",
  "M280 592 L280 690",
];

const pct = (y: number) => `${(y / H) * 100}%`;

interface NodeProps {
  top: number;
  collapsed: number;
  minH?: number;
  hideSummaryOnMobile?: boolean;
  width?: string;
  title: string;
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "default" | "decision";
}

function Node({ top, collapsed, minH = 44, hideSummaryOnMobile, width = "52%", title, summary, children, className, tone = "default" }: NodeProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <motion.button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((o) => !o)}
      animate={{ height: open ? "auto" : `${(collapsed / H) * 100}%` }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      style={{ top: pct(top), width, minHeight: minH }}
      className={cn(
        "absolute left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-lg border bg-base-2/95 px-3.5 py-2.5 text-left backdrop-blur-sm transition-colors",
        open ? "border-cyan/40" : "border-line-2 hover:border-white/25",
        tone === "decision" && "decision-node",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="label !text-ink-2">{title}</span>
        <span aria-hidden className="relative block size-1.5 rounded-full bg-cyan text-cyan">
          <span className="absolute inset-0 animate-pulse-ring rounded-full" />
        </span>
      </span>
      <span className={cn("mt-1 block text-[13px] text-ink", hideSummaryOnMobile && "hidden sm:block")}>{summary}</span>
      <span id={id} className={cn("mt-2.5 block border-t border-line pt-2.5", open ? "" : "invisible")}>
        {children}
      </span>
    </motion.button>
  );
}

const Row = ({ k, v, ok = true }: { k: string; v: string; ok?: boolean }) => (
  <span className="flex items-baseline justify-between gap-3 py-[3px] font-mono text-[10.5px] tracking-[0.06em]">
    <span className="text-ink-3">{k}</span>
    <span className={ok ? "text-eligible" : "text-ink-2"}>{v}</span>
  </span>
);

export function EngineViz({ className }: { className?: string }) {
  const [engineHover, setEngineHover] = useState(false);
  return (
    <div
      className={cn("relative mx-auto w-full max-w-[560px]", className)}
      style={{ aspectRatio: `${W} / ${H}` }}
      role="group"
      aria-label="Eligibility engine diagram: Stock Token, Asset State, Eligibility Engine, Policy, Decision"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="spine" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#54D6FF" stopOpacity="0.15" />
            <stop offset="1" stopColor="#3B82F6" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#54D6FF" stopOpacity="0.16" />
            <stop offset="1" stopColor="#54D6FF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* core glow + concentric hairlines */}
        <circle cx={CX} cy={CY} r={170} fill="url(#core)" />
        <circle cx={CX} cy={CY} r={R + 30} fill="none" stroke="rgb(255 255 255 / 0.05)" />
        <g className="decor-motion">
          <circle className="spin-slow" cx={CX} cy={CY} r={R + 16} fill="none" stroke="rgb(84 214 255 / 0.28)" strokeDasharray="1 7" strokeLinecap="round" strokeWidth="1.5" />
        </g>

        {/* spine + fan */}
        {SPINE.map((d) => (
          <path key={d} d={d} stroke="url(#spine)" strokeWidth="1.25" fill="none" />
        ))}
        {FAN.map((d) => (
          <path key={d} d={d} stroke="rgb(84 214 255 / 0.3)" strokeWidth="1" fill="none" />
        ))}
        {[...SPINE, ...FAN].map((d) => (
          <path key={`f-${d}`} d={d} className="flow-line" stroke="rgb(84 214 255 / 0.55)" strokeWidth="1" fill="none" />
        ))}

        {/* ring: base, cyan (evaluating), green (resolved) */}
        {SEGMENTS.map((s, i) => (
          <g key={i}>
            <path d={s.d} stroke="rgb(255 255 255 / 0.12)" strokeWidth="6" strokeLinecap="butt" fill="none" />
            <path d={s.d} className="seg-cyan" style={{ animationDelay: s.delay }} stroke="#54D6FF" strokeWidth="6" fill="none" />
            <path d={s.d} className="seg-green" style={{ animationDelay: s.delay }} stroke="#39E58C" strokeWidth="6" fill="none" />
          </g>
        ))}

        {/* particles */}
        <g className="particles">
          {[...SPINE, ...FAN].map((d, i) => (
            <circle key={`p-${i}`} r="2.2" fill="#54D6FF">
              <animateMotion dur={`${2.6 + (i % 3) * 0.5}s`} begin={`${(i * 0.45).toFixed(2)}s`} repeatCount="indefinite" path={d} />
              <animate attributeName="opacity" values="0;1;1;0" dur={`${2.6 + (i % 3) * 0.5}s`} begin={`${(i * 0.45).toFixed(2)}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      </svg>

      {/* Engine center */}
      <button
        type="button"
        onPointerEnter={(e) => e.pointerType === "mouse" && setEngineHover(true)}
        onPointerLeave={() => setEngineHover(false)}
        onFocus={() => setEngineHover(true)}
        onBlur={() => setEngineHover(false)}
        onClick={() => setEngineHover((v) => !v)}
        aria-label="Eligibility engine: nine deterministic checks"
        className="absolute left-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-center"
        style={{ top: pct(CY), width: `${((R * 2 - 26) / W) * 100}%`, aspectRatio: "1" }}
      >
        <span>
          <span className="label block !text-cyan">Engine</span>
          <span className="mt-1 block text-[26px] font-semibold leading-none tracking-[-0.04em] text-ink">{engineHover ? "9/9" : "9"}</span>
          <span className="mt-1.5 block font-mono text-[9.5px] tracking-[0.1em] text-ink-3 uppercase">{engineHover ? "checks pass" : "checks"}</span>
        </span>
      </button>

      <Node top={10} collapsed={64} hideSummaryOnMobile title="Stock Token" summary={<span className="font-mono text-[12px]">AAPL · 0x1234…5678</span>}>
        <Row k="NETWORK" v="RH CHAIN" ok={false} />
        <Row k="KIND" v="STOCK TOKEN" ok={false} />
      </Node>

      <Node top={96} collapsed={56} hideSummaryOnMobile title="Asset State" summary="Live on-chain state" width="56%">
        <Row k="TRANSFER" v="ENABLED" />
        <Row k="ORACLE" v="HEALTHY" />
        <Row k="REDEMPTION" v="AVAILABLE" />
        <Row k="RESTRICTIONS" v="NONE" />
      </Node>

      <Node top={548} collapsed={44} title="Policy · DEFAULT" summary={<span className="sr-only">Policy requirements</span>} width="56%">
        <Row k="MIN LIQUIDITY" v="$100,000" />
        <Row k="ORACLE" v="REQUIRED" ok={false} />
        <Row k="TRANSFER" v="REQUIRED" ok={false} />
        <Row k="REDEMPTION" v="REQUIRED" ok={false} />
      </Node>

      <Node top={690} collapsed={62} minH={56} title="Decision" tone="decision" summary={<span className="flex items-center gap-1.5 font-mono text-[13px] font-medium tracking-[0.06em] text-eligible">✓ ELIGIBLE</span>} width="50%">
        <Row k="PASSED" v="9" />
        <Row k="FAILED · UNKNOWN" v="0 · 0" ok={false} />
      </Node>
    </div>
  );
}
