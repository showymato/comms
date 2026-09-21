"use client";

import { useSyncExternalStore } from "react";

/**
 * The page-load choreography, as one tiny shared clock. The loader drives it; the nav, the hero copy and the sphere read it,
 * so the loader, the navigation and the hero behave as ONE continuous animation instead of a loading page followed by a page.
 *
 *   loader  wordmark + system initialisation over paper (the sphere is held, nothing drawn yet)
 *   sphere  the network starts forming behind the fading scrim
 *   morph   the wordmark flies into the navigation; nav, headline and the rest of the hero reveal
 *   done    loader removed; everything is live
 *
 * The server always renders "loader" (the loader is in the HTML, so there is never a flash of an unstyled hero).
 * Once played, client-side navigation back to `/` does not replay it.
 */
export type IntroPhase = "loader" | "sphere" | "morph" | "done";

const ORDER: IntroPhase[] = ["loader", "sphere", "morph", "done"];

let phase: IntroPhase = "loader";
const listeners = new Set<() => void>();

export function setIntroPhase(next: IntroPhase) {
  // phases only move forward
  if (ORDER.indexOf(next) <= ORDER.indexOf(phase)) return;
  phase = next;
  listeners.forEach((l) => l());
}

export function getIntroPhase() {
  return phase;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

export function useIntroPhase(): IntroPhase {
  return useSyncExternalStore(subscribe, () => phase, () => "loader" as IntroPhase);
}

/** true once the hero copy should be on screen (the wordmark has started its flight to the nav) */
export function useHeroRevealed() {
  const p = useIntroPhase();
  return p === "morph" || p === "done";
}

/** Stagger offsets (seconds) for the hero copy, measured from the moment it is revealed. */
export const HERO_DELAY = {
  nav: 0.15,
  eyebrow: 0.05,
  headline: 0.1,
  headlineStep: 0.085,
  /** the last line lands a beat after the first two */
  headlineLast: 0.06,
  description: 0.46,
  buttons: 0.56,
  capabilities: 0.68,
  readout: 0.82,
} as const;
