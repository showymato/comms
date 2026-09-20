# COMMS — project state

Collateral-eligibility layer for tokenized stocks. Next 16 + React 19 + Tailwind 4 + `motion`.
Runs on **live Robinhood data by default**; a labelled demo dataset is still available.

## Data modes — `NEXT_PUBLIC_DATA_MODE` (see `.env.example`)
- `live` (default): Robinhood registry / prices / corporate actions + Robinhood Chain (id 4663) contract reads. Anything COMMS cannot verify is **UNKNOWN**.
- `hybrid`: live data; checks with no live source are filled with values whose evidence source is `DEMO` (badged everywhere).
- `demo`: the built-in simulated dataset (`data/`, `lib/services/mock/`). Shows `DEMO MODE`; makes no network calls.

## Architecture
```
browser ─► LiveDataManager (lib/data/live-manager.ts, the only poller)
              │  /api/assets /api/prices[/sym] /api/corporate-actions /api/chain /api/chain/paused /api/contracts/[addr]
              ▼
         Next route handlers (app/api/**)  ── cache + dedupe + stale-while-revalidate (lib/providers/serve.ts, server-data.ts)
              ▼
         providers (lib/providers/): robinhood · robinhoodChain (lib/chain/rh-client.ts) · blockscout · coingecko · alphaVantage
              ▼
         normalize.ts (pure) ─► lib/live/evidence.ts (pure: real evidence → Asset, missing → UNKNOWN) ─► lib/engine.ts (pure, unchanged)
```
- Polling (`lib/data/config.ts`): registry 5 min, prices 30 s (server cache 15 s), chain 15 s (server cache 8 s), paused() sweep 5 min in chunks of 40 (public RPC 429s above ~50 calls/batch), watched-asset contract read 60 s. Backoff ×2 to 5 min on failure, paused while the tab is hidden.
- `LIVE` is only shown when data was fetched successfully inside its freshness window (`sliceHealth`), else LAST KNOWN / STALE / DEGRADED / OFFLINE.
- Robinhood APIs send no CORS headers → all upstream calls go through `/api` routes. Optional keys (`COINGECKO_API_KEY`, `ALPHA_VANTAGE_API_KEY`) are server env vars only; only the last 4 chars are ever reported.
- Live evidence actually available: asset status (Robinhood), `paused()` / bytecode / name / symbol / decimals / supply (chain, pinned block), quote freshness (Robinhood). **Not available → UNKNOWN**: transfer enabled, oracle healthy, redemption, transfer/issuer restrictions, collateral support, liquidity. So in live mode assets resolve to UNKNOWN (or INELIGIBLE if paused/inactive). Never ELIGIBLE without `hybrid`.
- The score is `NOT AVAILABLE` outside demo mode (its formula weights liquidity, which no live source supplies). Confidence is `null` (not reported), never invented.
- `/api/eligibility/check` (POST `{asset, policy}`) and `/api/eligibility/[address]` run the same engine server-side; the SDK playground calls it.

## Verify
- `npm run verify` — tsc, eslint, vitest (32 tests: engine, normalizers, evidence→engine, cache, LIVE-label rule), production build.
- Browser passes need the nova project's Playwright (run from a shell with `next start -p 3277` up):
  `node scripts/live-check.mjs http://localhost:3277` (30 checks: real rows, price, onchain evidence, UNKNOWN, failure injection, mobile),
  `node scripts/mode-check.mjs demo|hybrid <url>` (needs a dev server started with that `NEXT_PUBLIC_DATA_MODE`),
  `node scripts/shoot-hero.mjs`, `node scripts/fps-ab.mjs`, and the older `shoot-app.mjs` / `shoot-landing.mjs` passes.
- Ports 3100/3220 are often taken by other projects. Use 3277. Only one `next dev` per directory.
- Windows: stop a stray server with `Get-NetTCPConnection -LocalPort 3277 | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Routes
`/` landing; app shell at `/overview /assets /assets/[address] /eligibility /policies /events /corporate-actions /webhooks /api-reference /sdk /settings` (Settings → Data sources). ⌘K palette is global.

## Still demo-only (and labelled)
Webhook console, the demo event stream, organization/settings rows, and the landing sections that walk through the engine with AAPL/TSLA/NFLX/AMD scenarios (each carries a DEMO DATA tag). COMMS has no webhook backend or persistent event store; observed events (price change, state change, eligibility change, new corporate action) exist for the current browser session only.

## Motion system (partial)
`lib/motion.ts` (easing/springs/depth/field density), `hooks/use-motion.ts` (useReducedMotion, useCountUp, useScrollProgress, useReveal, useScrollDirection), `components/landing/collateral-field.tsx` (hero canvas: cursor-reactive network, real request/response events spawn packets), compressing nav with active-section indicator and live status pill, rolling price digits, count-up on change. Not built: scroll-driven system activation / sticky storytelling, the spatial check matrix, spatial architecture with particles, the cinematic real-time replay, policy→decision causal line, API response morphing, easter egg, ambient telemetry text, section-specific transitions.

## Gotchas
- Color token `base` collides with Tailwind `text-base` (font size). Use `text-[#05070A]` for dark-on-light text.
- Unlayered global CSS beats Tailwind utilities; global rules live in `@layer base`.
- `useStore` is in `hooks/use-store.ts` ("use client"); `lib/store.ts` stays server-safe.
- `useLive` passes `manager.initial` as the server snapshot — never `store.get()` — or hydration mismatches once data has arrived.
- `LiveDataManager.stop()` must reset `inflight`, otherwise a StrictMode re-attach dedupes onto an aborted request and never fetches.
- Blockscout (robinhoodchain.blockscout.com) answers our server with a Cloudflare bot challenge; verification therefore reports UNKNOWN. Not worked around.
- Git Bash tool: heredocs containing an apostrophe fail to parse — write files with the Write tool.

## Not verified
- 60 fps on real GPUs (headless software rendering measured ~15–25 fps with or without the hero canvas; the canvas adds roughly 7 ms/frame there).
- Reduced-motion path, screen-reader behaviour, and hybrid/demo landing pages beyond the scripted checks.
- Nothing is committed.
