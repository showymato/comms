import { AssetChecker } from "@/components/eligibility/asset-checker";
import { Reveal } from "@/components/ui/motion-bits";

/** PRODUCT INTERACTION: the same checker as the app — a real request against live evidence. */
export function CheckSection() {
  return (
    <section id="check" aria-labelledby="check-title" className="relative scroll-mt-16 border-t border-line py-28 lg:py-40">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <div className="label flex items-center gap-3">
              <span className="text-ink">04</span>
              <span aria-hidden className="h-px w-8 bg-line-2" />
              <span>Check an asset</span>
            </div>
            <h2 id="check-title" className="display display-lg mt-8 max-w-[14ch] text-ink">
              Run a check. Read the decision.
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="self-end lg:col-span-5">
            <p className="max-w-md text-[16px] leading-[1.6] text-ink-2">Paste a Stock Token contract address, choose a policy and run it. The request goes to the COMMS API, reads live state and returns a decision with its evidence.</p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="mt-14">
          <AssetChecker showLink />
        </Reveal>
      </div>
    </section>
  );
}
