import type { Metadata } from "next";
import { ApiReference } from "@/components/api/api-reference";
import { DevTabs } from "@/components/api/dev-tabs";

export const metadata: Metadata = { title: "API reference" };

export default function ApiReferencePage() {
  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-8">
        <div className="label mb-3">Developers</div>
        <h1 className="display text-[clamp(2.2rem,5vw,3.6rem)] text-ink">
          One API.
          <br />
          <span className="text-spectral">Every eligibility decision.</span>
        </h1>
      </div>
      <DevTabs />
      <ApiReference />
    </div>
  );
}
