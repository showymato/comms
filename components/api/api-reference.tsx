"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeBlock } from "@/components/ui/code-block";
import { StatusBadge } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { API_ENDPOINTS, BASE_URL, LANGUAGES, json, requestSample, type Language } from "@/data/api-docs";
import { REASON_TEXT } from "@/lib/status";
import { cn } from "@/lib/utils";

const SECTIONS = ["Overview", "Authentication", "Eligibility", "Assets", "Policies", "Webhooks", "SDK"] as const;
const anchor = (s: string) => s.toLowerCase();

const Method = ({ m }: { m: "GET" | "POST" }) => (
  <span className={cn("inline-flex h-6 items-center rounded-xs border px-1.5 font-mono text-[11px] font-medium tracking-[0.06em]", m === "POST" ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-eligible/30 bg-eligible/10 text-eligible")}>{m}</span>
);

export function ApiReference() {
  const [lang, setLang] = useState<Language>("javascript");
  const langTabs = (
    <Tabs label="Language" value={lang} onChange={setLang} options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))} size="sm" />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="API sections" className="hidden lg:block">
        <ul className="sticky top-20 space-y-0.5 border-l border-line">
          {SECTIONS.map((s) => (
            <li key={s}>
              <a href={`#${anchor(s)}`} className="-ml-px block border-l border-transparent py-1.5 pl-4 text-[13px] text-ink-3 transition-colors hover:border-cyan hover:text-ink">
                {s}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 max-w-4xl space-y-20">
        <section id="overview" className="scroll-mt-20">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Overview</h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
            The COMMS API answers one question: can this Stock Token be collateral, under this policy? Every response carries a status, the reasons and the evidence. The API is read-only: it never signs, trades, lends or takes custody.
          </p>
          <div className="mt-5 rounded-lg border border-line bg-surface/60 p-4">
            <div className="label mb-2">Base URL</div>
            <code className="font-mono text-[13px] text-ink">{BASE_URL}</code>
            <span className="ml-2 font-mono text-[11px] text-ink-4">(example host — demo)</span>
          </div>
          <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
            {(["ELIGIBLE", "INELIGIBLE", "CONDITIONAL", "UNKNOWN"] as const).map((s) => (
              <div key={s} className="bg-base-1 p-4">
                <StatusBadge status={s} />
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
                  {s === "ELIGIBLE" && "Every required check passed under the policy."}
                  {s === "INELIGIBLE" && "A required check failed. The reason codes say which."}
                  {s === "CONDITIONAL" && "No required check failed, but liquidity is below the policy minimum."}
                  {s === "UNKNOWN" && `Required evidence is missing. Reason: INSUFFICIENT_EVIDENCE. ${REASON_TEXT.INSUFFICIENT_EVIDENCE}`}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="authentication" className="scroll-mt-20">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Authentication</h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">Send your API key as a bearer token on every request. Keep it on the server.</p>
          <CodeBlock className="mt-4" lang="curl" title="Header" code={`Authorization: Bearer $COMMS_API_KEY`} />
        </section>

        {(["Eligibility", "Assets", "Policies", "Webhooks"] as const).map((section) => (
          <section key={section} id={anchor(section)} className="scroll-mt-20">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">{section}</h2>
              {section === "Eligibility" ? langTabs : null}
            </div>
            <div className="space-y-12">
              {API_ENDPOINTS.filter((e) => e.section === section).map((e) => {
                const sample = requestSample(e, lang);
                return (
                  <article key={e.id} id={e.id} className="scroll-mt-20">
                    <div className="flex flex-wrap items-center gap-3">
                      <Method m={e.method} />
                      <code className="font-mono text-[14px] text-ink">{e.path}</code>
                    </div>
                    <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">{e.description}</p>

                    <div className="mt-4 overflow-x-auto rounded-lg border border-line">
                      <table className="w-full min-w-[480px] text-[13px]">
                        <thead>
                          <tr className="border-b border-line bg-white/2 text-left">
                            {["Parameter", "In", "Type", ""].map((h, i) => (
                              <th key={i} scope="col" className="label px-4 py-2 font-normal">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {e.params.map((p) => (
                            <tr key={p.name} className="border-b border-line last:border-0">
                              <td className="px-4 py-2.5 font-mono text-[12.5px] text-ink">
                                {p.name}
                                {p.required ? <span className="ml-1 text-[10px] text-conditional" title="required">*<span className="sr-only"> required</span></span> : null}
                              </td>
                              <td className="px-4 font-mono text-[11.5px] text-ink-3">{p.in}</td>
                              <td className="px-4 font-mono text-[11.5px] text-cyan">{p.type}</td>
                              <td className="px-4 text-ink-2">{p.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <CodeBlock code={sample.code} lang={sample.hl} title="Request" />
                      <CodeBlock code={json(e.response)} lang="json" title="Response · 200" />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <section id="sdk" className="scroll-mt-20">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">SDK</h2>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
            Eligibility in one function. See the <Link href="/sdk" className="text-cyan underline-offset-4 hover:underline">SDK page</Link> for an interactive example.
          </p>
          <CodeBlock className="mt-4" lang="javascript" title="eligibility.js" code={`const result = await eligibility.check(tokenAddress);\n\nif (result.eligible) {\n  // protocol can continue\n}`} />
        </section>
      </div>
    </div>
  );
}
