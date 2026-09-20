import { Architecture } from "@/components/landing/architecture";
import { BuiltFor } from "@/components/landing/built-for";
import { CheckSection } from "@/components/landing/check-section";
import { DevelopersSection } from "@/components/landing/developers-section";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { Pipeline } from "@/components/landing/pipeline";
import { PolicySection } from "@/components/landing/policy-section";
import { RegistryPreview } from "@/components/landing/registry-preview";
import { Statement } from "@/components/landing/statement";
import { UnknownSection } from "@/components/landing/unknown-section";
import { Footer } from "@/components/site/footer";
import { SiteNav } from "@/components/site/site-nav";

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main id="main">
        <Hero />
        <Statement />
        <Pipeline />
        <UnknownSection />
        <CheckSection />
        <RegistryPreview />
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
