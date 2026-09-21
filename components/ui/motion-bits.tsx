"use client";

import { motion, MotionConfig, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useCountUp } from "@/hooks/use-motion";
import { formatAgo } from "@/lib/format";
import { useElapsed } from "@/hooks/use-utils";
import { cn } from "@/lib/utils";

/** Global: honour prefers-reduced-motion for every transform animation. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** fade-up on enter */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  );
}

/** Headline masked line-reveal: each child line slides up from a clip. */
export function ClipLines({ lines, className, lineClassName }: { lines: ReactNode[]; className?: string; lineClassName?: string }) {
  return (
    <span className={cn("block", className)}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className={cn("block", lineClassName)}
            initial={{ y: "105%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
          >
            {l}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/**
 * Editorial headline reveal: line by line — opacity + 20px rise + a slight blur that resolves to sharp.
 * Held back until `on` (the hero waits for the loader to hand over). The last line lands a beat after the others.
 */
export function BlurLines({
  lines,
  on = true,
  delay = 0,
  step = 0.085,
  lastExtra = 0.06,
  className,
}: {
  lines: ReactNode[];
  on?: boolean;
  delay?: number;
  step?: number;
  lastExtra?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("block", className)}>
      {lines.map((l, i) => (
        <motion.span
          key={i}
          className="block whitespace-nowrap will-change-[transform,opacity,filter]"
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={on ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(8px)" }}
          transition={{ duration: reduce ? 0.15 : 0.62, delay: on && !reduce ? delay + i * step + (i === lines.length - 1 ? lastExtra : 0) : 0, ease: [0.16, 1, 0.3, 1] }}
        >
          {l}
        </motion.span>
      ))}
    </span>
  );
}

/** Animated check mark (path draw-in). */
export function AnimatedCheck({ size = 20, className, delay = 0 }: { size?: number; className?: string; delay?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <motion.path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
}

/** Live-updating relative time. Renders the seed value during SSR, then ticks. */
export function Ago({ sec, className }: { sec: number; className?: string }) {
  const elapsed = useElapsed(1000);
  return (
    <span className={cn("tabular", className)} suppressHydrationWarning>
      {formatAgo(sec + elapsed)}
    </span>
  );
}

/** Count-up number: counts up once when scrolled into view, then animates only when the value actually changes. */
export function CountUp({ to, duration = 1.1, className, format }: { to: number; duration?: number; className?: string; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const v = useCountUp(to, { duration, fromZero: true, active: inView });

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {format ? format(v) : v}
    </span>
  );
}
