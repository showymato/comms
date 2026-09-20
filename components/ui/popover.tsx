"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Anchored popover: click to toggle, Esc / outside click to close, focus returns to trigger. */
export function Popover({
  trigger,
  children,
  align = "right",
  label,
  triggerClassName,
  panelClassName,
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  label: string;
  triggerClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button ref={btn} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={triggerClassName}>
        {trigger}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            id={id}
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "absolute top-[calc(100%+8px)] z-50 w-72 origin-top rounded-lg border border-line-2 bg-base-2 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
              align === "right" ? "right-0" : "left-0",
              panelClassName,
            )}
          >
            {children(() => setOpen(false))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
