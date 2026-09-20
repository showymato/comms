import type { Metadata } from "next";
import { EndpointDoc } from "@/components/developers/endpoint";
import { API_SPEC, SECTIONS } from "@/data/api-spec";

export const metadata: Metadata = { title: "API reference" };

const ANCHOR: Record<string, string> = { Eligibility: "eligibility", Assets: "assets", Policies: "policies", Events: "events", Webhooks: "webhooks", System: "system" };

export default function ApiPage() {
  return (
    <div>
      <div className="label">Developers / API reference</div>
      <h1 className="display display-lg mt-6 max-w-[14ch] text-ink uppercase">One API. Every decision.</h1>

      <section id="authentication" className="mt-12 scroll-mt-24 border-t border-ink/80 py-10">
        <h2 className="text-[26px] leading-tight font-medium tracking-[-0.035em] text-ink">Authentication</h2>
        <div className="mt-4 max-w-2xl space-y-4 text-[14.5px] leading-[1.65] text-ink-2">
          <p>The API is read-only and needs no key today. Requests are cached and rate-limited by the server, and upstream providers (Robinhood, Robinhood Chain RPC) are called at most once per cache window regardless of how many clients ask.</p>
          <p>
            Connecting a wallet in the app identifies you, but never authorizes a request. When keys or account-level actions are introduced they will require an <span className="text-ink">explicit signature</span> you can read — never a silent one — and COMMS will never ask for a transaction, an approval or a token-spend permission.
          </p>
          <p className="font-mono text-[12.5px] text-ink-3">Base URL: your deployment origin · Content-Type: application/json · Errors: {"{ data: null, meta: { error } }"} with a 4xx / 5xx status</p>
        </div>
      </section>

      {SECTIONS.map((s) => {
        const list = API_SPEC.filter((e) => e.section === s);
        return (
          <section key={s} id={ANCHOR[s]} className="scroll-mt-24">
            <h2 className="label mt-6 !text-ink">{s}</h2>
            {list.map((e) => (
              <EndpointDoc key={e.id} e={e} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
