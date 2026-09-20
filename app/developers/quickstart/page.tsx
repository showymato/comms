import type { Metadata } from "next";
import { LiveRequest } from "@/components/api/live-request";
import { CodeBlock } from "@/components/ui/code-block";
import { QuickstartAssets } from "@/components/developers/quickstart-assets";

export const metadata: Metadata = { title: "Quickstart" };

const HANDLE = `switch (result.eligibility) {
  case "ELIGIBLE":     // every required check passed
    break;
  case "CONDITIONAL":  // a policy threshold is not met — your call
    break;
  case "INELIGIBLE":   // result.reasons says why
    break;
  case "UNKNOWN":      // evidence missing — do not assume either way
    break;
}`;

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink/80 py-10">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[12px] text-ink-3">{n}</span>
        <h2 className="text-[clamp(1.5rem,2.6vw,2.2rem)] leading-tight font-medium tracking-[-0.04em] text-ink">{title}</h2>
      </div>
      <div className="mt-6 space-y-5 text-[14.5px] leading-[1.65] text-ink-2">{children}</div>
    </section>
  );
}

export default function QuickstartPage() {
  return (
    <div>
      <div className="label">Developers / Quickstart</div>
      <h1 className="display display-lg mt-6 max-w-[14ch] text-ink uppercase">First check in five minutes.</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-2">No key, no signup. Every request below is real and runs against this deployment.</p>

      <div className="mt-10">
        <Step n="01" title="List the assets">
          <p>The registry is the set of Stock Tokens COMMS can evaluate. Each has a contract address on Robinhood Chain (id 4663).</p>
          <LiveRequest request={{ method: "GET", path: "/api/assets" }} />
        </Step>

        <Step n="02" title="Check one">
          <p>Pass a contract address or a symbol. The default policy applies unless you provide another.</p>
          <QuickstartAssets />
        </Step>

        <Step n="03" title="Handle four outcomes">
          <p>
            <code className="font-mono text-[13px] text-ink">eligibility</code> is always one of four values. In <code className="font-mono text-[13px] text-ink">checks</code>, each key is the observed state its name describes (<code className="font-mono text-[13px] text-ink">tokenPaused: false</code> means not paused) and <code className="font-mono text-[13px] text-ink">null</code> means UNKNOWN; <code className="font-mono text-[13px] text-ink">evidence[].result</code> says PASS, FAIL or UNKNOWN.
          </p>
          <CodeBlock code={HANDLE} lang="typescript" title="handle.ts" />
          <p className="text-ink-3">Today, live evidence exists for asset status, token pause state and quote freshness. Transfer, oracle, redemption, restrictions and liquidity have no verifiable source yet, so a decision that requires them is UNKNOWN — by design.</p>
        </Step>
      </div>
    </div>
  );
}
