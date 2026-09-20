"use client";

import { LiveRequest, type RequestSpec } from "@/components/api/live-request";
import { CodeBlock } from "@/components/ui/code-block";
import type { ApiEndpoint } from "@/data/api-spec";
import { json } from "@/data/api-docs";
import { useAssets } from "@/hooks/use-live";
import { cn } from "@/lib/utils";

const METHOD_TONE = { GET: "bg-signal/15 text-cyan", POST: "bg-iris/12 text-iris" } as const;

/** One documented endpoint: description, parameters, response shape, and a playground that sends a real request. */
export function EndpointDoc({ e }: { e: ApiEndpoint }) {
  const { assets } = useAssets();
  // a real token from the live registry, so the example works as written; the placeholder stays until the registry has loaded
  const sample = (assets.find((a) => a.symbol === "AAPL") ?? assets[0])?.address ?? "0x…";
  const swap = (s: string) => s.replace("{{asset}}", sample);
  const request: RequestSpec = { method: e.try.method, path: swap(e.try.path), body: e.try.body ? JSON.parse(swap(JSON.stringify(e.try.body))) : undefined };

  return (
    <article id={e.id} className="scroll-mt-24 border-t border-ink/80 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-xs px-2 py-1 font-mono text-[11px] font-medium tracking-[0.06em]", METHOD_TONE[e.method])}>{e.method}</span>
        <code className="font-mono text-[14px] text-ink">{e.path}</code>
      </div>
      <h3 className="mt-4 text-[26px] leading-tight font-medium tracking-[-0.035em] text-ink">{e.summary}</h3>
      <p className="mt-3 max-w-2xl text-[14.5px] leading-[1.65] text-ink-2">{e.description}</p>

      {e.params.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <caption className="sr-only">Parameters</caption>
            <thead>
              <tr className="border-b border-line font-mono text-[10.5px] tracking-[0.08em] text-ink-3 uppercase">
                {["Name", "In", "Type", "Description"].map((h) => (
                  <th key={h} scope="col" className="py-2 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {e.params.map((p) => (
                <tr key={p.name} className="border-b border-line align-top">
                  <td className="py-2.5 pr-4 font-mono text-[12.5px] text-ink">
                    {p.name}
                    {p.required ? <span className="ml-1 text-conditional" title="required">*</span> : null}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-[12px] text-ink-3">{p.in}</td>
                  <td className="py-2.5 pr-4 font-mono text-[12px] text-ink-3">{p.type}</td>
                  <td className="py-2.5 text-ink-2">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-6">
        <LiveRequest request={request} />
      </div>
      <details className="group mt-4">
        <summary className="cursor-pointer font-mono text-[11.5px] tracking-[0.08em] text-ink-3 uppercase hover:text-ink">Response shape</summary>
        <CodeBlock code={json(e.shape)} lang="json" title="response shape (placeholders)" className="mt-3" />
      </details>
    </article>
  );
}
