import type { AssetService, EligibilityService, EventService, PolicyService, WebhookService } from "./contracts";
import {
  mockAssetService,
  mockEligibilityService,
  mockEventService,
  mockPolicyService,
  mockWebhookService,
} from "./mock";

/**
 * Service wiring — the single switch between demo data and a live backend.
 * Replace these five assignments with REST-backed implementations of ./contracts.
 */
export const assetService: AssetService = mockAssetService;
export const policyService: PolicyService = mockPolicyService;
export const eligibilityService: EligibilityService = mockEligibilityService;
export const eventService: EventService = mockEventService;
export const webhookService: WebhookService = mockWebhookService;

export type { AssetService, EligibilityService, EventService, PolicyService, WebhookService } from "./contracts";
