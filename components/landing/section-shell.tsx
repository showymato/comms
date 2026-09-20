import type { ReactNode } from "react";
import { SectionEyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/motion-bits";
import { cn } from "@/lib/utils";

/** Consistent rhythm for every landing section: index eyebrow, headline, lead, body. */
export function Section({
  id,
  index,
  eyebrow,
  title,
  lead,
  children,
  className,
  wide = false,
}: {
  id?: string;
  index: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={cn("relative scroll-mt-16 py-24 md:py-36", className)}>
      <div className={cn("mx-auto px-5 lg:px-10", wide ? "max-w-[1320px]" : "max-w-[1320px]")}>
        <Reveal>
          <SectionEyebrow index={index}>{eyebrow}</SectionEyebrow>
        </Reveal>
        <Reveal delay={0.05} className="mt-6 max-w-4xl">
          <h2 id={id ? `${id}-title` : undefined} className="display text-[clamp(2.1rem,4.6vw,4rem)] text-ink">
            {title}
          </h2>
        </Reveal>
        {lead ? (
          <Reveal delay={0.1} className="mt-6 max-w-2xl">
            <p className="text-[17px] leading-relaxed text-ink-2">{lead}</p>
          </Reveal>
        ) : null}
        {children ? <div className="mt-14 md:mt-16">{children}</div> : null}
      </div>
    </section>
  );
}
