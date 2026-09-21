"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block motion-reduce:!opacity-100">
      {children}
      &nbsp;
    </motion.span>
  );
}

/**
 * Scroll-driven word-by-word reveal: each word resolves from faint to full ink as its part of the scroll range passes.
 * Reduced motion keeps the identical markup (server and client must match); CSS `motion-reduce` shows every word at full ink.
 */
export function WordReveal({ text, className, as: Tag = "p" }: { text: string; className?: string; as?: "p" | "h2" }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.55"] });
  const words = text.split(" ");
  return (
    <Tag ref={ref as never} className={cn(className)} aria-label={text}>
      <span aria-hidden>
        {words.map((w, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, Math.min(1, (i + 1.6) / words.length)]}>
            {w}
          </Word>
        ))}
      </span>
    </Tag>
  );
}
