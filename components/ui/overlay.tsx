"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialog, useMounted } from "@/hooks/use-utils";
import { cn } from "@/lib/utils";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function Header({ id, eyebrow, title, onClose }: { id: string; eyebrow?: ReactNode; title: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        {eyebrow ? <div className="label mb-1.5">{eyebrow}</div> : null}
        <h2 id={id} className="truncate font-mono text-[15px] font-medium text-ink">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-1.5 grid size-8 shrink-0 place-items-center rounded-md text-ink-2 transition-colors hover:bg-white/6 hover:text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** Right-hand drawer with spring motion. Full-screen on mobile. */
export function Drawer({ open, onClose, title, eyebrow, children, footer, className }: OverlayProps) {
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useDialog(open, onClose, ref);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-base/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
            className={cn(
              "absolute inset-y-0 right-0 flex w-full flex-col border-l border-line-2 bg-base-2 shadow-[-24px_0_80px_rgba(0,0,0,0.55)] outline-none sm:w-[460px]",
              className,
            )}
          >
            <Header id={id} eyebrow={eyebrow} title={title} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer ? <div className="border-t border-line px-5 py-3">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Centered modal: scale + blur transition. */
export function Modal({ open, onClose, title, eyebrow, children, footer, className }: OverlayProps) {
  const mounted = useMounted();
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useDialog(open, onClose, ref);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-base/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line-2 bg-base-2 shadow-[0_40px_120px_rgba(0,0,0,0.6)] outline-none",
              className,
            )}
          >
            <Header id={id} eyebrow={eyebrow} title={title} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer ? <div className="border-t border-line px-5 py-3">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
