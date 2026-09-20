import type { AssetService, EligibilityService, EventService, PolicyService, WebhookService } from "./contracts";
import {
  mockAssetService,
  mockEligibilityService,
  mockEventService,
  mockPolicyService,
  mockWebhookService,
} from "./mock";
import { liveEligibilityService } from "./live";
import { DATA_MODE } from "@/lib/data/config";

/**
 * Service wiring — the single switch between demo data and live data.
 *
 *  • Assets / prices / chain state / corporate actions are NOT here: the browser gets them from the LiveDataManager
 *    (hooks/use-live.ts), which polls COMMS' own /api routes.
 *  • eligibilityService: live + hybrid evaluate real evidence; demo evaluates the labelled demo dataset.
 *  • policyService is user configuration (local), not market data.
 *  • eventService / webhookService stay demo-only: COMMS has no persistent event store or webhook backend yet,
 *    so they are only ever rendered with an explicit DEMO label (see EventStream, WebhookConsole).
 */
export const assetService: AssetService = mockAssetService;
export const policyService: PolicyService = mockPolicyService;
export const eligibilityService: EligibilityService = DATA_MODE === "demo" ? mockEligibilityService : liveEligibilityService;
export const eventService: EventService = mockEventService;
export const webhookService: WebhookService = mockWebhookService;

export type { AssetService, EligibilityService, EventService, PolicyService, WebhookService } from "./contracts";
