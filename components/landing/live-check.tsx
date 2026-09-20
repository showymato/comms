import { AssetChecker } from "@/components/eligibility/asset-checker";
import { Reveal } from "@/components/ui/motion-bits";
import { Section } from "./section-shell";

export function LiveCheckSection() {
  return (
    <Section
      id="check"
      index="04"
      eyebrow="Live asset check"
      title="Check an asset."
      lead="Submit a token address, choose a policy, and watch nine deterministic checks resolve into one decision. This runs the real engine on demo data."
      className="bg-linear-to-b from-transparent via-base-1/60 to-transparent"
    >
      <Reveal>
        <AssetChecker showLink />
      </Reveal>
    </Section>
  );
}
