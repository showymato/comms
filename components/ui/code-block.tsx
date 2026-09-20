"use client";

import { Check, Copy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { highlight, type Lang } from "@/lib/highlight";
import { cn } from "@/lib/utils";

export function CopyButton({ text, className, label = "Copy" }: { text: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* clipboard can be unavailable (insecure context); the visual confirmation is skipped */
          return;
        }
        setDone(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setDone(false), 1600);
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-ink/3 px-2 font-mono text-[11px] text-ink-2 transition-colors hover:bg-ink/8 hover:text-ink",
        className,
      )}
    >
      {done ? <Check size={12} className="text-eligible" /> : <Copy size={12} />}
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

export function CodeBlock({
  code,
  lang,
  title,
  className,
  reveal = false,
  lineNumbers = false,
}: {
  code: string;
  lang: Lang;
  title?: string;
  className?: string;
  /** line-by-line syntax reveal when scrolled into view */
  reveal?: boolean;
  lineNumbers?: boolean;
}) {
  const reduce = useReducedMotion();
  const lines = useMemo(() => code.split("\n"), [code]);
  const rendered = useMemo(() => lines.map((l) => highlight(l, lang)), [lines, lang]);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-base-1", className)}>
      <div className="flex items-center justify-between border-b border-line bg-ink/2 px-3 py-2">
        <span className="font-mono text-[11px] text-ink-3">{title ?? lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.75] text-ink-2" tabIndex={0} aria-label={title ? `${title} code` : "Code"}>
        <code>
          {rendered.map((nodes, i) => (
            <motion.div
              key={i}
              className="flex min-h-[1.75em]"
              initial={reveal && !reduce ? { opacity: 0, x: -6 } : false}
              whileInView={reveal && !reduce ? { opacity: 1, x: 0 } : undefined}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ delay: i * 0.045, duration: 0.35 }}
            >
              {lineNumbers ? <span aria-hidden className="mr-4 w-5 shrink-0 select-none text-right text-ink-4">{i + 1}</span> : null}
              <span className="whitespace-pre">{nodes.length ? nodes : " "}</span>
            </motion.div>
          ))}
        </code>
      </pre>
    </div>
  );
}
