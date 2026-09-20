"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LiveRequest } from "@/components/api/live-request";
import { CodeBlock } from "@/components/ui/code-block";
import { Reveal } from "@/components/ui/motion-bits";
import { useAssets } from "@/hooks/use-live";

const SDK = `import { createClient } from "@comms/eligibility";

const eligibility = createClient({ baseUrl: process.env.COMMS_API_URL });
const result = await eligibility.check(tokenAddress);

if (result.eligibility === "ELIGIBLE") {
  // protocol can continue
}`;

export function DevelopersSection() {
  const { assets } = useAssets();
  const first = assets[0];
  return (
    <section id="developers" aria-labelledby="dev-title" className="theme-ink relative scroll-mt-16 py-28 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="label flex items-center gap-3">
              <span className="text-ink">07</span>
              <span aria-hidden className="h-px w-8 bg-line-2" />
              <span>Developers</span>
            </div>
            <h2 id="dev-title" className="display display-lg mt-8 max-w-[14ch] text-ink">
              One call. One answer.
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="self-end lg:col-span-5">
            <p className="max-w-md text-[16px] leading-[1.6] text-ink-2">Ask before collateral enters your system. The request below is real — press it and read what this deployment returns.</p>
            <div className="mt-6 flex gap-6 font-mono text-[12px] tracking-[0.08em] uppercase">
              <Link href="/developers/quickstart" className="inline-flex items-center gap-1.5 text-ink underline decoration-ink/30 underline-offset-[6px] hover:decoration-ink">
                Quickstart <ArrowUpRight size={14} />
              </Link>
              <Link href="/developers/api" className="inline-flex items-center gap-1.5 text-ink underline decoration-ink/30 underline-offset-[6px] hover:decoration-ink">
                API reference <ArrowUpRight size={14} />
              </Link>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="mt-14">
          <LiveRequest request={{ method: "POST", path: "/api/eligibility/check", body: { asset: first?.address ?? "0x…", policy: "DEFAULT" } }} />
        </Reveal>
        <Reveal delay={0.2} className="mt-4">
          <CodeBlock code={SDK} lang="typescript" title="@comms/eligibility" reveal />
        </Reveal>
      </div>
    </section>
  );
}
