import type { Metadata } from "next";
import { DevTabs } from "@/components/api/dev-tabs";
import { SdkPlayground } from "@/components/api/sdk-playground";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = { title: "SDK" };

const RESULT_TYPE = `interface EligibilityResult {
  address: string;
  policy: string;
  status: "ELIGIBLE" | "INELIGIBLE" | "CONDITIONAL" | "UNKNOWN";
  eligible: boolean;          // status === "ELIGIBLE"
  score: number | null;       // supplementary; null when UNKNOWN
  reasons: string[];          // e.g. ["TRANSFER_DISABLED"]
  checks: { passed: number; failed: number; unknown: number };
  evaluatedAt: string;        // ISO-8601
}`;

const HANDLE = `const result = await eligibility.check(tokenAddress, policyId);

switch (result.status) {
  case "ELIGIBLE":
    // every required check passed
    break;
  case "CONDITIONAL":
    // liquidity below the policy minimum: your call
    break;
  case "INELIGIBLE":
    // result.reasons says why
    break;
  case "UNKNOWN":
    // INSUFFICIENT_EVIDENCE: do not assume either way
    break;
}`;

export default function SdkPage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-8">
        <div className="label mb-3">Developers</div>
        <h1 className="display text-[clamp(2.2rem,5vw,3.6rem)] text-ink">
          Eligibility in
          <br />
          <span className="text-spectral">one function.</span>
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-2">Ask before collateral enters your protocol. Choose a language, press RUN, and read the response. The demo executes on simulated data.</p>
      </div>
      <DevTabs />
      <SdkPlayground />
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-[15px] font-medium text-ink">The result</h2>
          <CodeBlock code={RESULT_TYPE} lang="typescript" title="types.ts" />
        </div>
        <div>
          <h2 className="mb-3 text-[15px] font-medium text-ink">Handle every status</h2>
          <CodeBlock code={HANDLE} lang="typescript" title="handle.ts" />
        </div>
      </div>
    </div>
  );
}
