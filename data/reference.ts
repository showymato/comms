/**
 * Fixed reference instant for the demo snapshot. All mock timestamps are offsets from it,
 * which keeps server and client renders identical (no Date.now() during render).
 */
export const REFERENCE_TIME = "2026-09-20T21:03:42Z";
export const REFERENCE_BLOCK = 1_204_331;
export const REFERENCE_MS = Date.parse(REFERENCE_TIME);

export const isoAgo = (sec: number) => new Date(REFERENCE_MS - sec * 1000).toISOString();
export const blockAgo = (sec: number) => REFERENCE_BLOCK - Math.round(sec / 2);

const BOOT = Date.now();
/** Demo clock: starts at the reference instant and advances in real time, so live events sort after seeded ones. */
export const demoNow = () => new Date(REFERENCE_MS + (Date.now() - BOOT)).toISOString();
