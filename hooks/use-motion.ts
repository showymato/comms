"use client";

import { useReducedMotion as useFramerReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type RefObject } from "react";

/** prefers-reduced-motion. Every motion hook below honours it: no animation, final value immediately. */
export const useReducedMotion = () => Boolean(useFramerReducedMotion());

/**
 * Count from the previous value to `value`. Animates ONLY when the value actually changes (and once on first
 * appearance if `fromZero`). Eased, rAF-driven, cancelled on unmount.
 */
export function useCountUp(value: number, { duration = 0.9, fromZero = false, active = true }: { duration?: number; fromZero?: boolean; active?: boolean } = {}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(fromZero && !reduce ? 0 : value);
  const from = useRef(fromZero && !reduce ? 0 : value);

  useEffect(() => {
    if (!active) return;
    if (reduce || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      const v = start + (value - start) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(Math.round(v));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce, active]);

  return shown;
}

/** 0..1 progress of the page scroll (or of an element passing through the viewport). Passive listener, rAF-throttled. */
export function useScrollProgress(target?: RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = target?.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const total = r.height + window.innerHeight;
        setP(Math.min(1, Math.max(0, (window.innerHeight - r.top) / total)));
      } else {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);
  return p;
}

/** True once the element has entered the viewport (and stays true). Pass `once={false}` to track live visibility. */
export function useReveal<T extends HTMLElement>(margin = "-8% 0px", once = true): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) setSeen(false);
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, once]);
  return [ref, seen];
}

/** Scroll direction with hysteresis: "down" past `threshold` px, "up" on any upward scroll. Drives nav compress / expand. */
export function useScrollDirection(threshold = 80): "up" | "down" {
  const [dir, setDir] = useState<"up" | "down">("up");
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (y < threshold) setDir("up");
        else if (y > last + 4) setDir("down");
        else if (y < last - 4) setDir("up");
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [threshold]);
  return dir;
}
