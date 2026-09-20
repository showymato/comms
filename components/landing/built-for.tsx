import { Reveal } from "@/components/ui/motion-bits";
import { Section } from "./section-shell";

const AUDIENCES = [
  { tag: "DeFi protocols", head: "Ask before collateral enters the system.", body: "One call returns a status, the reasons and the evidence, so a listing or a risk parameter never rests on an assumption." },
  { tag: "Risk teams", head: "Requirements you can write down.", body: "Encode minimum liquidity and oracle, transfer and redemption requirements as a policy, test it against real asset state, and keep the history of every change of status." },
  { tag: "Developers", head: "A decision as a function.", body: "REST API, webhooks and an SDK. Typed results, predictable statuses and an event when a decision changes." },
];

const NEVER = ["Lend money", "Borrow money", "Custody funds", "Liquidate positions", "Execute trades", "Sign transactions"];

export function BuiltFor() {
  return (
    <Section
      id="protocols"
      index="10"
      eyebrow="Built for protocols"
      title={
        <>
          Built for protocols.
          <br />
          <span className="text-ink-3">Designed for certainty.</span>
        </>
      }
    >
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.tag} delay={i * 0.06} className="bg-base-1 p-6 sm:p-8">
            <div className="label !text-cyan">{a.tag}</div>
            <h3 className="mt-5 text-[20px] leading-snug font-medium tracking-[-0.02em] text-ink">{a.head}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{a.body}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-6 rounded-xl border border-line bg-surface/40 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-[17px] font-medium text-ink">Read-only infrastructure.</h3>
          <span className="label">What COMMS does not do</span>
        </div>
        <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEVER.map((n) => (
            <li key={n} className="flex items-center gap-3 border-b border-line pb-3 text-[14px] text-ink-2">
              <span aria-hidden className="font-mono text-ineligible">✕</span>
              {n}
              <span className="sr-only"> — COMMS does not do this</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13.5px] leading-relaxed text-ink-3">
          COMMS is the compatibility and decision layer beneath lending markets and other protocols. It answers one question, and shows its work.
        </p>
      </Reveal>
    </Section>
  );
}
