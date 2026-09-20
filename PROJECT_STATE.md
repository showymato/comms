# COMMS — project state

Collateral-eligibility layer for tokenized stocks. Next 16 + React 19 + Tailwind 4 + `motion`. Demo data only.

## Verify
- `npm run verify` — tsc, eslint, vitest (11 engine tests), production build.
- Browser passes (need the nova project's Playwright; run from PowerShell, not Git Bash):
  `npx next start -p 3277`, then `node scripts/shoot-app.mjs http://localhost:3277 1440 900 shots/app` (29 checks),
  `... 390 844 shots/mobile` (24 checks), `node scripts/shoot-landing.mjs http://localhost:3277 1440 900`.
  `scripts/find-overflow.mjs`, `bisect-overflow.mjs`, `probe.mjs` chase mobile overflow.
- Ports 3100/3220 are often taken by other projects. Use 3277.

## Architecture
- `lib/engine.ts` — pure deterministic engine. Missing evidence → UNKNOWN (never guessed); hard failure → INELIGIBLE; liquidity < policy min → CONDITIONAL.
- `lib/services/contracts.ts` — five service interfaces. `lib/services/mock/` — the only mock code. Swap wiring in `lib/services/index.ts` for a real API.
- Routes: `/` landing; app shell at `/overview /assets /assets/[address] /eligibility /policies /events /webhooks /api-reference /sdk /settings`. ⌘K palette is global.

## Assumptions to confirm against the real product spec (I only had the brief)
- CONDITIONAL is produced only by liquidity below the policy minimum.
- Score formula: 90 pts check pass-rate + 10 pts liquidity coverage (2× min). Placeholder; supplementary only.
- Auth is shown as a bearer key; API host `api.comms.example`; no SDK package name is claimed.
- Jurisdiction and Underlying-asset layers appear on the landing matrix without a result (no engine check exists for them).

## Gotchas found
- Color token `base` collides with Tailwind `text-base` (font size). Use `text-[#05070A]` for dark-on-light text.
- Unlayered global CSS beats Tailwind utilities; global rules live in `@layer base`.
- `sr-only` inside `overflow-x-auto` leaks page width unless the scroller is positioned (global rule handles it).
- Single-column grids need `minmax(0,1fr)` (global `.grid > * {min-width:0}` handles it).
- `useStore` is in `hooks/use-store.ts` ("use client"); `lib/store.ts` stays server-safe.

## Not done / not verified
- No real chain, oracle or backend. Nothing committed (repo is the home-directory repo).
- Reduced-motion path is implemented but was not exercised in a browser.
- Screen-reader behaviour not tested with a real reader; keyboard paths (palette, table nav, drawers, Esc) were.
