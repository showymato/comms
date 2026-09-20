/**
 * MOCK IMPLEMENTATIONS — demo data only.
 * Everything in this folder is replaceable by real API clients; see ../contracts.ts.
 */
import type {
  Asset,
  CheckRun,
  EligibilityEvent,
  EventType,
  Policy,
  PolicyInput,
  WebhookDelivery,
  WebhookEndpoint,
} from "@/types";
import { ASSETS, emptyAsset } from "@/data/assets";
import { POLICIES } from "@/data/policies";
import { EVENT_TEMPLATES, HISTORIES, seedEvents } from "@/data/events";
import { WEBHOOK_ENDPOINTS } from "@/data/webhooks";
import { REFERENCE_TIME, demoNow, isoAgo } from "@/data/reference";
import { evaluate } from "@/lib/engine";
import { createStore } from "@/lib/store";
import { prng } from "@/lib/prng";
import type { AssetService, EligibilityService, EventService, PolicyService, WebhookService } from "../contracts";

const latency = (ms = 220) => new Promise<void>((r) => setTimeout(r, ms));

/* ───────────── assets ───────────── */
export const mockAssetService: AssetService = {
  async list() {
    return [...ASSETS];
  },
  async get(address) {
    return ASSETS.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;
  },
};

/* ───────────── policies ───────────── */
const policyStore = createStore<Policy[]>(POLICIES);

export const mockPolicyService: PolicyService = {
  state: policyStore,
  async list() {
    return policyStore.get();
  },
  async get(id) {
    return policyStore.get().find((p) => p.id === id) ?? null;
  },
  async create(input: PolicyInput) {
    await latency(300);
    const id = input.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_") || "POLICY";
    const unique = policyStore.get().some((p) => p.id === id) ? `${id}_${policyStore.get().length + 1}` : id;
    const policy: Policy = { ...input, id: unique, name: unique, createdAt: demoNow(), builtIn: false };
    policyStore.set((p) => [...p, policy]);
    return policy;
  },
  async update(id, input) {
    await latency(200);
    let updated!: Policy;
    policyStore.set((all) =>
      all.map((p) => {
        if (p.id !== id) return p;
        updated = { ...p, ...input, id: p.id, name: p.name };
        return updated;
      }),
    );
    return updated;
  },
};

/* ───────────── eligibility ───────────── */
const runStore = createStore<CheckRun[]>([
  { id: "run_a1", address: ASSETS[0].address, symbol: "AAPL", policyId: "DEFAULT", status: "ELIGIBLE", timestamp: isoAgo(240) },
  { id: "run_a2", address: ASSETS[3].address, symbol: "TSLA", policyId: "DEFAULT", status: "CONDITIONAL", timestamp: isoAgo(611) },
  { id: "run_a3", address: ASSETS[7].address, symbol: "NFLX", policyId: "DEFAULT", status: "INELIGIBLE", timestamp: isoAgo(1_320) },
  { id: "run_a4", address: ASSETS[9].address, symbol: "AMD", policyId: "DEFAULT", status: "UNKNOWN", timestamp: isoAgo(2_040) },
]);

export const mockEligibilityService: EligibilityService = {
  runs: runStore,
  evaluate(asset: Asset, policy: Policy) {
    return evaluate(asset, policy, REFERENCE_TIME);
  },
  async check(address, policyId = "DEFAULT") {
    await latency(180);
    const policy = (await mockPolicyService.get(policyId)) ?? (await mockPolicyService.get("DEFAULT"));
    if (!policy) return null;
    // An address with no evidence is answered UNKNOWN / INSUFFICIENT_EVIDENCE, never guessed.
    const asset = (await mockAssetService.get(address)) ?? emptyAsset(address);
    const result = evaluate(asset, policy, demoNow());
    runStore.set((r) =>
      [
        { id: `run_${r.length + 1}_${Date.now().toString(36)}`, address: asset.address, symbol: asset.symbol, policyId: policy.id, status: result.status, timestamp: result.evaluatedAt },
        ...r,
      ].slice(0, 12),
    );
    return result;
  },
  async history(address) {
    const asset = await mockAssetService.get(address);
    if (!asset) return [];
    const hand = HISTORIES[asset.symbol];
    if (hand) return hand;
    const current = evaluate(asset, POLICIES[0], REFERENCE_TIME).status;
    return [
      {
        id: `hist_${asset.symbol}_0`,
        timestamp: isoAgo(6 * 86_400),
        address: asset.address,
        symbol: asset.symbol,
        type: "ELIGIBILITY_CHANGED",
        previous: "UNKNOWN",
        current,
        reason: current === "ELIGIBLE" ? "ALL_CHECKS_PASSED" : current === "CONDITIONAL" ? "LIQUIDITY_BELOW_MINIMUM" : "INSUFFICIENT_EVIDENCE",
      },
    ];
  },
};

/* ───────────── events ───────────── */
let liveSeq = 0;
const feedRand = prng(77);

export const mockEventService: EventService = {
  async list() {
    return seedEvents();
  },
  stream(onEvent) {
    // Simulated stream: a plausible transition every 3–6 seconds.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const t = EVENT_TEMPLATES[Math.floor(feedRand() * EVENT_TEMPLATES.length)];
      const a = ASSETS[Math.floor(feedRand() * ASSETS.length)];
      onEvent({ id: `evt_live_${++liveSeq}`, timestamp: demoNow(), address: a.address, symbol: a.symbol, ...t });
      timer = setTimeout(tick, 3000 + feedRand() * 3000);
    };
    timer = setTimeout(tick, 1800);
    return () => clearTimeout(timer);
  },
};

/* ───────────── webhooks ───────────── */
function seedDeliveries(): Record<string, WebhookDelivery[]> {
  const out: Record<string, WebhookDelivery[]> = {};
  WEBHOOK_ENDPOINTS.forEach((ep, ei) => {
    const r = prng(900 + ei);
    const failing = ep.status === "FAILING";
    const rows: WebhookDelivery[] = [];
    let age = ep.lastDeliveryAgoSec;
    for (let i = 0; i < 12; i++) {
      const allowed = EVENT_TEMPLATES.filter((t) => ep.events.includes(t.type));
      const t = allowed[Math.floor(r() * allowed.length)];
      const a = ASSETS[Math.floor(r() * ASSETS.length)];
      const bad = failing ? r() < 0.4 : r() < 0.02;
      const timestamp = isoAgo(age);
      rows.push({
        id: `dlv_${ep.id}_${i}`,
        endpointId: ep.id,
        event: t.type,
        timestamp,
        httpStatus: bad ? (r() < 0.5 ? 500 : 504) : 200,
        durationMs: bad ? 4800 + Math.floor(r() * 400) : 60 + Math.floor(r() * 220),
        attempt: bad ? 3 : 1,
        payload: { event: t.type, asset: a.address, symbol: a.symbol, previous: t.previous, current: t.current, reason: t.reason, timestamp },
      });
      age += 300 + Math.floor(r() * 4200);
    }
    out[ep.id] = rows;
  });
  return out;
}

const endpointStore = createStore<WebhookEndpoint[]>(WEBHOOK_ENDPOINTS);
const deliveryStore = createStore<Record<string, WebhookDelivery[]>>(seedDeliveries());

export const mockWebhookService: WebhookService = {
  endpoints: endpointStore,
  deliveries: deliveryStore,
  async list() {
    return endpointStore.get();
  },
  async create({ url, events }: { url: string; events: EventType[] }) {
    await latency(350);
    const ep: WebhookEndpoint = {
      id: `wh_${(endpointStore.get().length + 1).toString().padStart(2, "0")}`,
      url,
      status: "ACTIVE",
      events,
      lastDeliveryAgoSec: 0,
      successRate: 100,
      createdAt: demoNow(),
    };
    endpointStore.set((all) => [...all, ep]);
    deliveryStore.set((d) => ({ ...d, [ep.id]: [] }));
    return ep;
  },
  async retry(endpointId, deliveryId) {
    await latency(600);
    let result!: WebhookDelivery;
    deliveryStore.set((all) => ({
      ...all,
      [endpointId]: (all[endpointId] ?? []).map((d) => {
        if (d.id !== deliveryId) return d;
        result = { ...d, httpStatus: 200, durationMs: 118, attempt: d.attempt + 1, timestamp: demoNow() };
        return result;
      }),
    }));
    return result;
  },
};
