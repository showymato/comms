"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-ink text-on-ink hover:bg-ink/85",
  accent: "bg-signal text-[#0a0a0a] hover:bg-[#33d3ff]",
  secondary: "bg-surface-2 text-ink hairline hover:bg-surface-3",
  ghost: "text-ink-2 hover:text-ink hover:bg-ink/5",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2.5",
} as const;

type Common = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  magnetic?: boolean;
  children: ReactNode;
  className?: string;
};

type Props = Common &
  (({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) | ({ href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">));

/** Button / link with an optional subtle magnetic pull toward the pointer (mouse only). */
export function Button({ variant = "secondary", size = "md", magnetic = false, className, children, ...rest }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });

  const cls = cn(
    "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap select-none transition-[background-color,color,box-shadow,opacity,translate] duration-150 disabled:opacity-40 disabled:pointer-events-none active:translate-y-px",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  const inner =
    "href" in rest && rest.href !== undefined ? (
      <Link {...(rest as ComponentProps<typeof Link>)} className={cls}>
        {children}
      </Link>
    ) : (
      <button type="button" {...(rest as ComponentProps<"button">)} className={cls}>
        {children}
      </button>
    );

  if (!magnetic) return inner;

  return (
    <motion.span
      ref={ref}
      className="inline-block"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.18);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.28);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {inner}
    </motion.span>
  );
}
