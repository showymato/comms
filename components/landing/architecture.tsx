"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { Boxes, Cable, Coins, Layers, ShieldCheck, SlidersHorizontal, Webhook } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Section } from "./section-shell";

interface ArchNode {
  name: string;
  line: string;
  icon: ReactNode;
  body: string;
  takes: string;
  gives: string;
}

const NODES: ArchNode[] = [
  { name: "Stock Token", line: "The tokenized stock contract", icon: <Coins size={18} />, body: "A tokenized share issued as a token on RH Chain. It is the subject of every check.", takes: "—", gives: "Contract state" },
  { name: "RH Chain / External Data", line: "Where state and market data come from", icon: <Cable size={18} />, body: "COMMS reads token state from RH Chain and market data from external sources. Access is read-only: nothing is written to the chain.", takes: "Token contract", gives: "Raw state" },
  { name: "State Engine", line: "Current state, per token", icon: <Layers size={18} />, body: "Turns what was read into the current state of each token, keeping the source, block and timestamp of every value.", takes: "Raw state", gives: "State + evidence" },
  { name: "Eligibility Engine", line: "Nine deterministic checks", icon: <ShieldCheck size={18} />, body: "Runs the checks on the current state. The same state always produces the same result, and unknown evidence stays unknown.", takes: "State + evidence", gives: "Check results" },
  { name: "Policy Engine", line: "Applies your requirements", icon: <SlidersHorizontal size={18} />, body: "Compares the check results with a protocol's policy: minimum liquidity, and whether the oracle, transfers and redemption are required.", takes: "Check results", gives: "ELIGIBLE · INELIGIBLE · CONDITIONAL · UNKNOWN" },
  { name: "REST API + Webhooks", line: "Decisions on request, events on change", icon: <Webhook size={18} />, body: "Returns the decision, its reasons and its evidence on request, and sends an event when a decision changes.", takes: "Decision", gives: "Response · event" },
  { name: "DeFi Protocols", line: "Where the decision is used", icon: <Boxes size={18} />, body: "Lending markets and other protocols act on the decision. COMMS does not lend, borrow, custody, liquidate, trade or sign.", takes: "Decision", gives: "—" },
];

export function Architecture() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 70%"] });
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const [lit, setLit] = useState(1);
  const [picked, setPicked] = useState<number | null>(null);
  useMotionValueEvent(scrollYProgress, "change", (p) => setLit(Math.max(1, Math.min(NODES.length, Math.floor(p * NODES.length) + 1))));

  const selected = picked ?? lit - 1;

  return (
    <Section
      id="architecture"
      index="09"
      eyebrow="Architecture"
      title={
        <>
          From asset state
          <br />
          <span className="text-ink-3">to protocol decision.</span>
        </>
      }
      lead="Seven stages, read-only end to end. Scroll to light the pipeline, or select any stage."
    >
      <ol ref={ref} className="relative mx-auto max-w-4xl" aria-label="COMMS architecture pipeline">
        <span aria-hidden className="absolute top-6 bottom-6 left-[27px] w-px bg-line-2" />
        <motion.span aria-hidden className="absolute top-6 bottom-6 left-[27px] w-px origin-top bg-linear-to-b from-cyan via-azure to-iris" style={{ scaleY: fill }} />

        {NODES.map((n, i) => {
          const on = i < lit;
          const open = i === selected;
          return (
            <li key={n.name} className="relative pb-3 last:pb-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setPicked(picked === i ? null : i)}
                className={cn(
                  "group relative flex w-full gap-5 rounded-xl border p-3.5 text-left transition-[background-color,border-color,opacity] duration-500",
                  open ? "border-cyan/35 bg-surface-2" : on ? "border-line-2 bg-surface/70 hover:bg-surface" : "border-line bg-base-1/60 opacity-55 hover:opacity-90",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 grid size-[46px] shrink-0 place-items-center rounded-lg border transition-[color,border-color,box-shadow,background-color] duration-500",
                    on ? "border-cyan/50 bg-base text-cyan shadow-[0_0_28px_rgba(84,214,255,0.22)]" : "border-line bg-base text-ink-4",
                  )}
                >
                  {n.icon}
                </span>
                <span className="min-w-0 flex-1 self-center">
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-[10.5px] text-ink-4">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[16px] font-medium text-ink">{n.name}</span>
                  </span>
                  <span className="mt-0.5 block text-[13.5px] text-ink-3">{n.line}</span>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.span initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="block overflow-hidden">
                        <span className="mt-3 block max-w-2xl text-[14px] leading-relaxed text-ink-2">{n.body}</span>
                        <span className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-[11px]">
                          <span>
                            <span className="text-ink-4">TAKES </span>
                            <span className="text-ink-2">{n.takes}</span>
                          </span>
                          <span>
                            <span className="text-ink-4">GIVES </span>
                            <span className="text-cyan">{n.gives}</span>
                          </span>
                        </span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
