import { Architecture } from "@/components/landing/architecture";
import { BuiltFor } from "@/components/landing/built-for";
import { ConditionalMatrix } from "@/components/landing/conditional-matrix";
import { DevelopersSection } from "@/components/landing/developers-section";
import { EngineStory } from "@/components/landing/engine-story";
import { EvidenceSection } from "@/components/landing/evidence-section";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { LiveCheckSection } from "@/components/landing/live-check";
import { LandingNav } from "@/components/landing/nav";
import { PolicySection } from "@/components/landing/policy-section";
import { SystemPulse } from "@/components/landing/system-pulse";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main id="main">
        <Hero />
        <ConditionalMatrix />
        <EngineStory />
        <LiveCheckSection />
        <EvidenceSection />
        <SystemPulse />
        <PolicySection />
        <DevelopersSection />
        <Architecture />
        <BuiltFor />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
