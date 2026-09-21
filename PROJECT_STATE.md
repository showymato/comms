# COMMS — project state

Collateral-eligibility layer for tokenized stocks. Next 16 + React 19 + Tailwind 4 + `motion` + RainbowKit/wagmi/viem.
Runs on **live Robinhood data by default**; a labelled demo dataset is still available.

## Design system
- Light editorial by default (paper `#F5F5F2`, ink `#0A0A0A`, graphite grays); cyan `#00C8FF` / violet `#7C5CFF` are signal only. `.theme-ink` (in `app/globals.css`) re-declares the same tokens for dark sections, so `text-ink`, `bg-ink/5`, `border-line` flip together. Overlays use `ink/N` (never `white/N`).
- `text-cyan` is the text-safe shade; `bg-signal` is the pure infrastructure cyan for fills. Text on ink uses `text-on-ink` (not `text-base`, which is a Tailwind font size).
- Type: Geist + Geist Mono, `.display` (+ `display-xl/lg/md`) for editorial headlines, `.label` for mono captions.

## Routes
- Marketing: `/` (hero sphere, statement, sticky pipeline, UNKNOWN, live check, live registry, policy, developers, architecture, built-for, final CTA + system status).
- App shell `/app`: `/app` (overview) · `/app/assets` · `/app/assets/[symbol]` (symbol or address) · `/app/eligibility` · `/app/policies` (studio + simulator) · `/app/events` · `/app/corporate-actions` · `/app/webhooks` · `/app/workspace` (wallet) · `/app/settings`.
- Developers: `/developers` · `/developers/quickstart` · `/developers/api` (auth, eligibility, assets, policies, events, webhooks; each with a real-request playground) · `/developers/sdk` (+ examples).
- Old paths (`/overview`, `/assets`, `/api-reference`, `/sdk` …) redirect (see `next.config.ts`).

## Hero sphere (`components/landing/sphere/`)
- `engine.ts` — framework-free Canvas 2D renderer with its own 3D projection (deliberately no Three.js / WebGL: ~18 nodes, ~27 curves). Core + 2 token orbits + outer orbit of pipeline (State/Checks/Policy/Decision) and source (Registry/Prices/RH Chain) nodes. Springs for tilt/focus/zoom, DPR cap 1.75 (1.5 compact), IntersectionObserver + visibilitychange pause, compact mode (≤639px or coarse pointer: fewer nodes/granules, ~30 fps), reduced motion = no loop, single frames on demand. **Granule field** (900 desktop / 320 compact, purely visual, carries no data): fine dust on/inside the sphere with differential rotation + twinkle; the cursor parts it, a touched node gathers it into a status-tinted orbiting cloud, clicks send a ripple; batched into ≤24 fills/frame. Mouse/touch drag rotates with inertia (a selected node re-centres once the hand lets go).
- `use-sphere-data.ts` — tokens = real registry assets (FEATURED symbols first *only if present*), status = engine result, system-node health = real slice health. `token-card.tsx` — evidence card (real price/volume/multiplier/checks; UNKNOWN when no evidence; wallet `balanceOf` read via wagmi). `hero-sphere.tsx` — orchestration: **no card until a node (or chip) is clicked/tapped** — hover only highlights the node and names its status, and prefetches its quote; the card follows the selected node imperatively, closes via ✕ / Esc / click on empty space / re-clicking the chip; accessible token list (arrow keys), wallet chip/arc, LiveDataManager signals → pulses/re-evaluation, scroll → zoom/tilt + stage lighting, CTA hooks (`explore` / `evaluate` via ref handle), error panel, `?debug=1` overlay (also exposes `window.__sphere`, debug only).
- Live mode never yields ELIGIBLE, so the hero card honestly reads UNKNOWN for live assets; `hybrid` shows DEMO outcomes labelled.
- Header `NetworkPill` is now the `[RH CHAIN ▾]` inspector (real block / RPC health / explorer / read-only notice).

## Load sequence + hero entrance (`components/landing/hero-intro.ts`, `hero-loader.tsx`)
- One shared clock (`useIntroPhase`): `loader → sphere → morph → done`. Loader (~1.7 s): wordmark resolves from letter offsets, four status rows report in (registry READY only once really loaded; oracle layer says UNKNOWN because there is no verifiable source; demo builds say DEMO), sphere is *held* then starts forming behind the dissolving paper scrim (`engine.begin()`), then the wordmark FLIPs onto the nav logo (`[data-nav-logo]`) while nav, headline (`BlurLines`), copy and readout reveal (`HERO_DELAY`).
- Loader type is CSS-animated (plays before hydration). Fail-safe: `.intro-loader` hides itself after 6 s; hidden under prefers-reduced-motion (phase jumps to `done`); any key/pointer/wheel/touch skips it; client-side return to `/` does not replay it. `LiveRuntime`'s old boot screen is disabled on `/` (still used elsewhere).
- Engine additions: held intro + staged build (points → body → orbit curves → links → nodes → core), cursor gravity (2–4.5 px, screen-space, springy, lights own links), hover dims unrelated nodes/links (node scale 1.08×), first-touch **wake** (~1.2 s: slows, links surface, packets, core swells, first token names its status, `LIVE COLLATERAL STATE` pill — says DEMO / LAST KNOWN / STALE etc. when not actually live), scroll reorganisation (token links fade, pipeline links strengthen after ~30 %). Token card chip now reads CHECKING STATE → ORACLE → RESTRICTIONS before the result.
- Hero: sentence-case headline (Geist, 500, -0.045em, ~73 px at 1440), fine grid + faint teal field + static grain at 1–3 % (no violet), `● LIVE / Robinhood Chain · 4663` with breathing dot only when actually LIVE.
- Scripts: `scripts/intro-check.mjs` (timed frames + wake; `FRAMES=…` env), `hero-interact.mjs` (gravity/hover/click/scroll), `reduced-check.mjs`, `skip-check.mjs`. Pass `caret: "initial"` to screenshots — Playwright's default caret hiding triggers a false hydration warning.
- Deliberately not done: Three.js/R3F (Canvas 2D kept), auto-opening the card on first hover (card stays click-to-open), a "Pricing" nav item (no page exists), Safari / real-GPU fps / real wallet app testing.

## API (app/api)
`POST /api/eligibility/check` · `GET /api/eligibility/[address]` · `GET /api/assets` · `GET /api/assets/[address]` · `…/eligibility` · `…/history` · `GET|POST /api/policies` · `GET /api/policies/[id]` · `GET /api/events` · `GET|POST /api/webhooks` · `/api/prices` · `/api/chain` · `/api/corporate-actions` · `/api/contracts/[address]` · `/api/status`.
- Decision shape: `{ asset, symbol, eligibility, eligible, policy, reasons, checks{id: observed state|null}, summary, evidence[], sources, degraded, mode, evaluatedAt }` (`lib/api-shape.ts`). Missing evidence → `null` / UNKNOWN; confidence is `null` unless a source reports one.
- Policies are **stateless**: `POST /api/policies` returns an id `c.<base64url>` that encodes the thresholds (`lib/live/policy-codec.ts`); nothing is stored server-side (`persisted:false`). `resolvePolicy` accepts these ids.
- Events (`lib/chain/events.ts`, `lib/live/event-feed.ts`): real `eth_getLogs` over all Stock Token contracts (Paused/Unpaused → TRANSFER_RESTRICTION; Upgraded/OwnershipTransferred/Transfer → CONTRACT_EVENT) + Robinhood corporate actions. ASSET_STATUS_CHANGED / ELIGIBILITY_CHANGED are only observed per browser session (LiveDataManager diffs); ORACLE_CHANGE has no source and is never emitted.
- Webhooks: `POST /api/webhooks` sends ONE real HMAC-signed `webhook.test` to a public https endpoint (SSRF-guarded, rate-limited) and returns the real status/latency. Endpoints and delivery records live in the browser (`lib/workspace.ts`). There is no persistent delivery pipeline.

## Data modes — `NEXT_PUBLIC_DATA_MODE`
`live` (default: LIVE DATA badge) · `hybrid` (checks with no live source badged DEMO) · `demo` (DEMO ENVIRONMENT everywhere). Fixed per deployment, not a runtime toggle — Settings shows the active mode and how to change it.

## Architecture
```
browser ─► LiveDataManager (lib/data/live-manager.ts, the only poller) + eventsFeed (lib/data/events-feed.ts)
              ▼  /api routes (cache + dedupe + SWR: lib/providers/serve.ts, server-data.ts)
         providers: robinhood · robinhoodChain (lib/chain/rh-client.ts) · blockscout · coingecko · alphaVantage
              ▼  normalize.ts ─► lib/live/evidence.ts (real evidence → Asset, missing → UNKNOWN) ─► lib/engine.ts (pure)
```
- `hooks/use-evaluated.ts` derives every marketing/dashboard number (counts, coverage, decisions) from the live registry — nothing typed in.
- Live evidence available: asset status, `paused()`/bytecode/name/symbol/decimals/supply (chain, pinned block), quote freshness. **UNKNOWN**: transfer, oracle, redemption, restrictions, collateral support, liquidity → live assets resolve UNKNOWN (or INELIGIBLE if paused/inactive). Never ELIGIBLE without `hybrid`.
- Bulk `/rhj/prices` reports volume `"0"` for many symbols (real); per-symbol quotes carry real volume.

## Wallet (RainbowKit + wagmi 2 + viem + TanStack Query)
- `lib/wallet/chain.ts` (Robinhood Chain 4663, Blockscout), `lib/wallet/config.ts` (`getDefaultConfig` when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set, else injected/MetaMask/Coinbase only + visible "Wallet connection configuration required" notice), `components/wallet/*`.
- Read-only: no transactions, approvals or spend. The only signature is the explicit "Sign to verify" on the workspace page (`personal_sign`, verified in-browser).
- `next.config.ts` aliases the optional `@x402/*` modules (pulled in by `@wagmi/connectors` → Base Account → CDP SDK) to an empty stub.
- Workspace data (watchlist, saved policies, recent checks, webhook endpoints) is **local to the browser** (`lib/local-store.ts`) and labelled so — not synced, not tied to the address.

## SDK
`packages/eligibility` (`@comms/eligibility`): zero-dependency typed client (`createClient`, `check`, `assets.*`, `policies.*`, `events.list`). Consumed from source (tsconfig path alias); not published.

## Env (`.env.example`, real values in git-ignored `.env.local`)
`NEXT_PUBLIC_DATA_MODE`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `ROBINHOOD_RPC_URL` (server, private; empty = public RPC), `NEXT_PUBLIC_RH_RPC_URL` (browser reads), `COINGECKO_API_KEY`, `ALPHA_VANTAGE_API_KEY`, `BLOCKSCOUT_API_URL`, `COMMS_API_URL`. Empty values are treated as unset.

## Verify
- `npm run verify` — tsc, eslint, vitest (37 tests), production build.
- Browser passes need the nova project's Playwright (dev server on 3277). `scripts/shoot.mjs <base> <prefix> <WxH> <paths…>` (prefix with `MSYS_NO_PATHCONV=1` in Git Bash), `scripts/tour.mjs` (scroll tour), `scripts/wallet-check.mjs`, `scripts/flow-check.mjs`. The older `live-check`/`mode-check`/`shoot-*` scripts still use pre-redesign paths.
- Ports 3100/3220 are often taken. Windows: stop a stray server with `Get-NetTCPConnection -LocalPort 3277 | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Gotchas
- Unlayered global CSS beats Tailwind utilities; global rules live in `@layer base`.
- `useStore` (`hooks/use-store.ts`) and `useLocal` (`hooks/use-local.ts`) pass the initial snapshot as the server snapshot — never read `store.get()` for SSR — or hydration mismatches.
- `LiveDataManager.stop()` must reset `inflight`, otherwise a StrictMode re-attach never fetches.
- Blockscout answers our server with a Cloudflare bot challenge; verification reports UNKNOWN. Not worked around.
- Git Bash tool: heredocs containing an apostrophe fail — write files with the Write tool.
- `.next/dev/types` can be stale after adding routes; `tsc` errors there vanish once the dev server regenerates them (or after `next build`).

## Not done / not verified
- Real wallet connect + wrong-network flow were not exercised with an actual wallet (only the connect modal and the config notice were verified in a headless browser).
- 60 fps on real GPUs (headless software rendering measured 36-60 fps with the debug overlay); screen-reader behaviour.
- Wallet paths were exercised with a stubbed EIP-1193 provider (connected, wrong network), not a real wallet app.
- Sphere: no cinematic replay of a real state change was observed live (no asset changed state during testing; the code path is `recalculate` on LiveDataManager signals).
- No runtime LIVE/DEMO toggle (mode is per deployment).
- Scroll-driven items still missing: cinematic real-time replay, policy→decision causal line, API response morphing.
- No persistent backend: webhook delivery pipeline, policy storage, eligibility history, server-side accounts.
- WebSocket event subscriptions (polling only).
