"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const noop = () => () => {};

/** true on the client after hydration, false during SSR — hydration-safe. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Whole seconds elapsed since mount (0 during SSR). Drives hydration-safe "12s ago" labels. */
export function useElapsed(intervalMs = 1000): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setN(Math.floor((performance.now() - start) / 1000)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return n;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Modal behaviour: Esc to close, Tab focus loop, scroll lock, focus restore. */
export function useDialog(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node)?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open, ref]);
}
