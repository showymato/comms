import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-2 bg-ink/4 px-1.5 font-mono text-[10px] text-ink-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Panel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("relative rounded-lg border border-line bg-surface/80 hairline-top", className)}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  meta,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-4 py-3", className)}>
      <h2 className="label !text-ink-2">{title}</h2>
      {meta ? <div className="flex items-center gap-2 text-xs text-ink-3">{meta}</div> : null}
    </div>
  );
}

/** Explicit demo-data marker. Mock data is never presented as live. */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-xs border border-conditional/30 bg-conditional/10 px-1.5 font-mono text-[10px] tracking-[0.08em] text-conditional",
        className,
      )}
      title="This interface is running on simulated demo data"
    >
      DEMO DATA
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function SectionEyebrow({ index, children }: { index?: string; children: ReactNode }) {
  return (
    <div className="label flex items-center gap-3">
      {index ? <span className="text-cyan">{index}</span> : null}
      {index ? <span aria-hidden className="h-px w-8 bg-line-2" /> : null}
      <span>{children}</span>
    </div>
  );
}
