import type {
  Asset,
  CheckRun,
  EligibilityEvent,
  EligibilityResult,
  EventType,
  Policy,
  PolicyInput,
  WebhookDelivery,
  WebhookEndpoint,
} from "@/types";
import type { Store } from "@/lib/store";

/**
 * Service contracts. The UI only ever talks to these interfaces.
 * To go live, implement them against the REST API (POST /v1/eligibility/check, GET /v1/assets/{address}/eligibility, …)
 * and swap the wiring in `lib/services/index.ts`. Nothing else in the app changes.
 */

export interface AssetService {
  list(): Promise<Asset[]>;
  get(address: string): Promise<Asset | null>;
}

export interface PolicyService {
  /** Observable list for client components. */
  readonly state: Store<Policy[]>;
  list(): Promise<Policy[]>;
  get(id: string): Promise<Policy | null>;
  create(input: PolicyInput): Promise<Policy>;
  update(id: string, input: PolicyInput): Promise<Policy>;
}

export interface EligibilityService {
  /** POST /v1/eligibility/check */
  check(address: string, policyId?: string): Promise<EligibilityResult | null>;
  /** Pure, synchronous evaluation of a known asset against a policy (used by the simulator). */
  evaluate(asset: Asset, policy: Policy): EligibilityResult;
  /** GET /v1/assets/{address}/eligibility/history */
  history(address: string): Promise<EligibilityEvent[]>;
  readonly runs: Store<CheckRun[]>;
}

export interface EventService {
  list(): Promise<EligibilityEvent[]>;
  /** Subscribes to the live feed; returns an unsubscribe function. */
  stream(onEvent: (e: EligibilityEvent) => void): () => void;
}

export interface WebhookService {
  readonly endpoints: Store<WebhookEndpoint[]>;
  readonly deliveries: Store<Record<string, WebhookDelivery[]>>;
  list(): Promise<WebhookEndpoint[]>;
  create(input: { url: string; events: EventType[] }): Promise<WebhookEndpoint>;
  retry(endpointId: string, deliveryId: string): Promise<WebhookDelivery>;
}
