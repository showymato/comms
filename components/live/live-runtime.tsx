"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLive, useLiveConnection } from "@/hooks/use-live";
import { DATA_MODE } from "@/lib/data/config";
import { cn } from "@/lib/utils";

type Dot = "pending" | "ok" | "failed";

function Row({ label, state }: { label: string; state: Dot }) {
  return (
    <li className="flex items-center justify-between gap-8 font-mono text-[11px] tracking-[0.1em] text-ink-2">
      <span>{label}</span>
      <span
        aria-label={state}
        className={cn("size-1.5 rounded-full transition-colors duration-300", state === "ok" ? "bg-eligible" : state === "failed" ? "bg-conditional" : "animate-pulse bg-ink-4")}
      />
    </li>
  );
}

/**
 * Mounts the LiveDataManager for the whole app and shows the boot sequence ONLY while real connections are
 * initialising. It appears if they take longer than 350 ms, and never blocks past 7 s.
 */
export function LiveRuntime() {
  useLiveConnection();
  // the home page has its own cinematic loader (components/landing/hero-loader.tsx) that hands over to the hero; this boot screen serves every other route
  const home = usePathname() === "/";
  const booting = useLive((s) => s.booting);
  const registry = useLive((s) => s.registry);
  const prices = useLive((s) => s.prices);
  const chain = useLive((s) => s.chain);
  const ready = useLive((s) => s.assets.length > 0);
  const [armed, setArmed] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (DATA_MODE === "demo") return;
    const a = setTimeout(() => setArmed(true), 350);
    const b = setTimeout(() => setExpired(true), 7000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  const dot = (s: { data: unknown; error: string | null }): Dot => (s.data !== null ? "ok" : s.error ? "failed" : "pending");
  const show = DATA_MODE !== "demo" && !home && booting && armed && !expired;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[90] grid place-items-center bg-base"
        >
          <div className="w-[300px]">
            <div className="font-display text-[22px] font-medium tracking-[0.18em] text-ink">COMMS</div>
            <div className="label mt-2 mb-6">Connecting to live infrastructure</div>
            <ul className="space-y-3 border-t border-line pt-5">
              <Row label="ASSET REGISTRY" state={dot(registry)} />
              <Row label="MARKET DATA" state={dot(prices)} />
              <Row label="ROBINHOOD CHAIN" state={dot(chain)} />
              <Row label="ELIGIBILITY ENGINE" state={ready ? "ok" : registry.error ? "failed" : "pending"} />
            </ul>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
