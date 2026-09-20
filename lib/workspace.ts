import { localStore } from "@/lib/local-store";
import type { EligibilityStatus } from "@/types";

/**
 * The visitor's workspace, stored LOCALLY in this browser. Nothing here is synced to a server account.
 * Connecting a wallet identifies who is looking at it; it does not upload or sign anything.
 */

export interface SavedPolicy {
  id: string;
  name: string;
  minLiquidityUsd: number;
  oracleRequired: boolean;
  transferRequired: boolean;
  redemptionRequired: boolean;
  savedAt: string;
}

export interface RecentCheck {
  id: string;
  symbol: string;
  address: string;
  policy: string;
  eligibility: EligibilityStatus;
  at: string;
}

export interface WebhookEndpointLocal {
  id: string;
  url: string;
  events: string[];
  /** stored in this browser so signed test deliveries can be repeated; never sent anywhere except the endpoint's own signature header */
  secret: string | null;
  createdAt: string;
}

export interface WebhookDeliveryLocal {
  id: string;
  endpointId: string;
  event: string;
  attempt: number;
  sentAt: string;
  delivered: boolean;
  status: number | null;
  latencyMs: number;
  error: string | null;
  payload: unknown;
  responsePreview: string;
}

export const watchlistStore = localStore<string[]>("comms.watchlist.v1", []);
export const savedPoliciesStore = localStore<SavedPolicy[]>("comms.policies.v1", []);
export const recentChecksStore = localStore<RecentCheck[]>("comms.checks.v1", []);
export const webhookEndpointsStore = localStore<WebhookEndpointLocal[]>("comms.webhooks.v1", []);
export const webhookDeliveriesStore = localStore<WebhookDeliveryLocal[]>("comms.deliveries.v1", []);

export const toggleWatch = (symbol: string) => watchlistStore.set((w) => (w.includes(symbol) ? w.filter((s) => s !== symbol) : [...w, symbol]));

export const recordCheck = (c: Omit<RecentCheck, "id" | "at">) =>
  recentChecksStore.set((r) => [{ ...c, id: `chk_${Date.now().toString(36)}`, at: new Date().toISOString() }, ...r].slice(0, 20));
