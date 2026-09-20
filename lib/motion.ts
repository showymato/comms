/**
 * Central motion configuration. One easing family, one set of springs — every animated surface pulls from here
 * so the whole interface moves like one machine.
 *
 * Rule: an animation must answer "what is happening / what changed / what caused it / where did the data come from /
 * where is the decision going / what evidence supports it". If it answers none of those, it does not belong.
 */

/** Major UI transitions (decision changes, drawers, section reveals). */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

export const DURATION = {
  micro: 0.18,
  base: 0.4,
  major: 0.7,
  cinematic: 1.1,
} as const;

/** Spring presets: cursor light, magnetic buttons, drawers, decision cards. */
export const SPRING = {
  cursor: { stiffness: 90, damping: 18, mass: 0.6 },
  magnetic: { stiffness: 260, damping: 18, mass: 0.4 },
  drawer: { stiffness: 380, damping: 36 },
  card: { stiffness: 300, damping: 30 },
} as const;

/** Spatial-depth parallax factors: background < midground < content (content is 1×). */
export const DEPTH = { background: 0.85, midground: 0.95, content: 1 } as const;

/** Maximum magnetic pull, px. */
export const MAGNET_MAX_PX = 8;

/** Field density: canvas nodes per 100k px², tuned so mobile stays light. */
export const FIELD = { desktop: 72, mobile: 30, linkDistance: 150, cursorRadius: 170 } as const;
