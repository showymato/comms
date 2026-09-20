import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main id="main" className="noise relative isolate grid min-h-svh place-items-center overflow-hidden px-6 text-center">
      <div aria-hidden className="glow-top pointer-events-none absolute inset-0 -z-10" />
      <div>
        <LogoMark size={44} tone="accent" className="mx-auto" />
        <p className="label mt-8 !text-unknown">Status · UNKNOWN</p>
        <h1 className="display mt-3 text-[clamp(2rem,5vw,3.4rem)]">Nothing on record for this address.</h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-2">COMMS does not guess. Reason: <span className="font-mono text-ink">INSUFFICIENT_EVIDENCE</span>.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/assets" variant="primary">Open the registry</Button>
          <Button href="/" variant="secondary">Home</Button>
        </div>
        <p className="mt-10 font-mono text-[11px] text-ink-4">
          <Link href="/overview" className="hover:text-ink-2">/overview</Link>
        </p>
      </div>
    </main>
  );
}
