import { AssetChecker } from "@/components/eligibility/asset-checker";
import { Reveal } from "@/components/ui/motion-bits";
import { DATA_MODE } from "@/lib/data/config";
import { Section } from "./section-shell";

export function LiveCheckSection() {
  return (
    <Section
      id="check"
      index="04"
      eyebrow="Live asset check"
      title="Check an asset."
      demo={DATA_MODE !== "live"}
      lead={DATA_MODE === "demo" ? "Submit a token address, choose a policy, and watch nine deterministic checks resolve into one decision. This runs the real engine on demo data." : "Submit a Stock Token address, choose a policy, and watch nine deterministic checks resolve into one decision — evaluated on live Robinhood and Robinhood Chain evidence. What cannot be verified is UNKNOWN."}
      className="bg-linear-to-b from-transparent via-base-1/60 to-transparent"
    >
      <Reveal>
        <AssetChecker showLink />
      </Reveal>
    </Section>
  );
}
