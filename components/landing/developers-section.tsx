import { ArrowRight } from "lucide-react";
import { SdkPlayground } from "@/components/api/sdk-playground";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion-bits";
import { API_ENDPOINTS } from "@/data/api-docs";
import { Section } from "./section-shell";

export function DevelopersSection() {
  return (
    <Section
      id="developers"
      index="08"
      eyebrow="API / SDK"
      title={
        <>
          One API.
          <br />
          <span className="text-ink-3">Every eligibility decision.</span>
        </>
      }
      lead="Eligibility in one function. Ask before collateral enters your system, and get a status, the reasons and the evidence back."
    >
      <Reveal>
        <SdkPlayground />
      </Reveal>

      <Reveal delay={0.05} className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {API_ENDPOINTS.map((e) => (
          <a key={e.id} href={`/api-reference#${e.id}`} className="group flex flex-col gap-1.5 bg-base-1 p-4 transition-colors hover:bg-surface">
            <span className="flex items-center gap-2 font-mono text-[12px]">
              <span className={e.method === "POST" ? "text-cyan" : "text-eligible"}>{e.method}</span>
              <span className="truncate text-ink">{e.path}</span>
            </span>
            <span className="text-[12.5px] text-ink-3 group-hover:text-ink-2">{e.summary}</span>
          </a>
        ))}
      </Reveal>

      <Reveal className="mt-8 flex flex-wrap gap-3">
        <Button href="/api-reference" variant="primary" magnetic>
          API reference <ArrowRight size={15} />
        </Button>
        <Button href="/sdk" variant="secondary" magnetic>
          SDK
        </Button>
      </Reveal>
    </Section>
  );
}
