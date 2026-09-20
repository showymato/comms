import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemLine } from "@/components/live/system-line";
import { Reveal } from "@/components/ui/motion-bits";
import { prng } from "@/lib/prng";

/* A slow eligibility network: deterministic nodes, hairline links, travelling status chips. */
const rnd = prng(31);
const NODES = Array.from({ length: 26 }, () => ({ x: 20 + rnd() * 1160, y: 30 + rnd() * 540 }));
const LINKS = NODES.flatMap((a, i) =>
  NODES.slice(i + 1)
    .map((b) => ({ a, b, d: Math.hypot(a.x - b.x, a.y - b.y) }))
    .filter((l) => l.d < 210)
    .map((l) => l),
);
const PATHS = LINKS.filter((_, i) => i % 5 === 0).slice(0, 9);

const CHIPS = [
  { t: "0x…  ✓ ELIGIBLE", c: "text-eligible", y: "14%", dur: 46, delay: -6 },
  { t: "0x…  ◐ CONDITIONAL", c: "text-conditional", y: "30%", dur: 58, delay: -30 },
  { t: "0x…  ✕ INELIGIBLE", c: "text-ineligible", y: "62%", dur: 52, delay: -14 },
  { t: "0x…  ? UNKNOWN", c: "text-unknown", y: "78%", dur: 64, delay: -44 },
  { t: "0x…  ✓ ELIGIBLE", c: "text-eligible", y: "46%", dur: 70, delay: -52 },
  { t: "decision.evaluated", c: "text-cyan", y: "88%", dur: 56, delay: -20 },
];

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="noise relative isolate overflow-hidden border-t border-line">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="glow-top absolute inset-0" />
        <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full opacity-60">
          {LINKS.map((l, i) => (
            <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
          ))}
          {NODES.map((n, i) => (
            <circle key={i} cx={n.x} cy={n.y} r={i % 6 === 0 ? 3 : 1.8} fill={i % 6 === 0 ? "#54D6FF" : "rgb(255 255 255 / 0.25)"} />
          ))}
          <g className="particles">
            {PATHS.map((l, i) => (
              <circle key={i} r="2.4" fill={["#54D6FF", "#39E58C", "#54D6FF"][i % 3]}>
                <animateMotion dur={`${9 + (i % 4) * 2.5}s`} begin={`${-i * 1.7}s`} repeatCount="indefinite" path={`M${l.a.x} ${l.a.y} L${l.b.x} ${l.b.y}`} />
              </circle>
            ))}
          </g>
        </svg>
        <div className="decor-motion absolute inset-0 hidden sm:block">
          {CHIPS.map((c) => (
            <span
              key={c.t}
              className={`chip-travel absolute left-0 rounded-xs border border-line bg-base-1/80 px-2 py-1 font-mono text-[10.5px] tracking-[0.06em] whitespace-pre backdrop-blur-sm ${c.c}`}
              style={{ top: c.y, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
            >
              {c.t}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-base to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-base to-transparent" />
      </div>

      <div className="mx-auto flex min-h-[92svh] max-w-[1320px] flex-col items-center justify-center px-5 py-28 text-center lg:px-10">
        <Reveal>
          <h2 id="cta-title" className="display text-[clamp(2.4rem,6vw,5rem)]">
            Build with certainty.
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="mt-6 max-w-xl">
          <p className="text-[17px] leading-relaxed text-ink-2">Give your protocol a deterministic answer before collateral enters the system.</p>
        </Reveal>
        <Reveal delay={0.16} className="mt-9 flex flex-wrap justify-center gap-3">
          <Button href="/api-reference" variant="primary" size="lg" magnetic>
            Explore API <ArrowRight size={16} />
          </Button>
          <Button href="/assets" variant="secondary" size="lg" magnetic>
            Explore Assets
          </Button>
        </Reveal>

        <Reveal delay={0.1} className="mt-24 md:mt-32">
          <div aria-hidden className="bg-linear-to-b from-ink via-ink/60 to-transparent bg-clip-text text-[clamp(4.5rem,17vw,15rem)] leading-[0.9] font-semibold tracking-[0.04em] text-transparent select-none">
            COMMS
          </div>
          <p className="-mt-2 font-mono text-[12px] tracking-[0.24em] text-ink-2 uppercase sm:-mt-4">Know before you lend.</p>
        </Reveal>

        <Reveal delay={0.1} className="mt-20">
          <SystemLine />
        </Reveal>
      </div>
    </section>
  );
}
