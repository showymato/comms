import type { Metadata } from "next";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = { title: "SDK" };

const INSTALL = `# inside this repository the package is consumed from source
import { createClient } from "@comms/eligibility";   // packages/eligibility/src/index.ts`;

const BASIC = `import { createClient } from "@comms/eligibility";

const eligibility = createClient({ baseUrl: process.env.COMMS_API_URL });

const result = await eligibility.check(tokenAddress);

if (result.eligibility === "ELIGIBLE") {
  // protocol can continue
}`;

const CUSTOM = `// custom policy, inline
const strict = await eligibility.check(tokenAddress, {
  minLiquidityUsd: 2_000_000,
  oracleRequired: true,
  transferRequired: true,
  redemptionRequired: true,
});

// or mint a portable policy id once, and reuse it
const policy = await eligibility.policies.create({ minLiquidityUsd: 250_000, redemptionRequired: false });
const again = await eligibility.check(tokenAddress, policy.id);`;

const TYPES = `interface EligibilityResult {
  asset: string;                      // contract address
  symbol: string;
  eligibility: "ELIGIBLE" | "INELIGIBLE" | "CONDITIONAL" | "UNKNOWN";
  eligible: boolean;                  // eligibility === "ELIGIBLE"
  policy: string;
  reasons: string[];                  // e.g. ["INSUFFICIENT_EVIDENCE"]
  checks: Record<CheckId, boolean | null>;   // observed state (tokenPaused: false = not paused) · null UNKNOWN
  evidence: Evidence[];               // source, block, timestamp, confidence (null if not reported)
  evaluatedAt: string;                // ISO-8601
}`;

const EX_GATE = `// Example: gate a listing on the decision
async function canList(token: string) {
  const r = await eligibility.check(token);
  switch (r.eligibility) {
    case "ELIGIBLE":
      return { ok: true };
    case "UNKNOWN":
      // missing evidence is not a pass: hold the listing and surface why
      return { ok: false, hold: true, missing: r.evidence.filter((e) => e.result === "UNKNOWN").map((e) => e.check) };
    default:
      return { ok: false, reasons: r.reasons };
  }
}`;

const EX_EVENTS = `// Example: react to real onchain lifecycle events
const events = await eligibility.events.list({ type: ["TRANSFER_RESTRICTION"], blocks: 20000 });
for (const e of events) {
  console.log(e.symbol, e.name, e.block, e.txHash); // Paused / Unpaused, with the transaction that caused it
}`;

export default function SdkPage() {
  return (
    <div>
      <div className="label">Developers / SDK</div>
      <h1 className="display display-lg mt-6 max-w-[14ch] text-ink uppercase">Eligibility in one function.</h1>
      <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-2">
        <code className="font-mono text-[13px] text-ink">@comms/eligibility</code> is a zero-dependency, fully typed client. It is read-only: it never signs, sends a transaction or asks for an approval.
      </p>

      <div className="mt-10 space-y-10">
        <CodeBlock code={INSTALL} lang="typescript" title="import" />
        <CodeBlock code={BASIC} lang="typescript" title="default policy" reveal />
        <CodeBlock code={CUSTOM} lang="typescript" title="custom policy" />
        <CodeBlock code={TYPES} lang="typescript" title="typed results" />
      </div>

      <section id="examples" className="mt-16 scroll-mt-24 border-t border-ink/80 pt-10">
        <h2 className="text-[26px] leading-tight font-medium tracking-[-0.035em] text-ink">Examples</h2>
        <div className="mt-8 space-y-6">
          <CodeBlock code={EX_GATE} lang="typescript" title="gate-a-listing.ts" />
          <CodeBlock code={EX_EVENTS} lang="typescript" title="watch-lifecycle.ts" />
        </div>
      </section>
    </div>
  );
}
