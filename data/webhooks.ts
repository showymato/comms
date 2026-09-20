import type { WebhookEndpoint } from "@/types";
import { isoAgo } from "./reference";

export const WEBHOOK_ENDPOINTS: WebhookEndpoint[] = [
  {
    id: "wh_01",
    url: "https://api.lendmarket.example/hooks/comms",
    status: "ACTIVE",
    events: ["ELIGIBILITY_CHANGED", "ASSET_PAUSED", "ORACLE_UNAVAILABLE"],
    lastDeliveryAgoSec: 74,
    successRate: 99.8,
    createdAt: isoAgo(38 * 86_400),
  },
  {
    id: "wh_02",
    url: "https://risk.vaultworks.example/ingest",
    status: "ACTIVE",
    events: ["ELIGIBILITY_CHANGED", "ASSET_PAUSED", "ORACLE_UNAVAILABLE", "TRANSFER_RESTRICTED", "ASSET_REDEEMED", "ASSET_REACTIVATED"],
    lastDeliveryAgoSec: 212,
    successRate: 100,
    createdAt: isoAgo(21 * 86_400),
  },
  {
    id: "wh_03",
    url: "https://ops.collateral-desk.example/alerts",
    status: "FAILING",
    events: ["ELIGIBILITY_CHANGED", "TRANSFER_RESTRICTED"],
    lastDeliveryAgoSec: 415,
    successRate: 71.4,
    createdAt: isoAgo(9 * 86_400),
  },
  {
    id: "wh_04",
    url: "https://staging.protocol.example/hooks/comms",
    status: "PAUSED",
    events: ["ELIGIBILITY_CHANGED"],
    lastDeliveryAgoSec: 3 * 86_400,
    successRate: 92.1,
    createdAt: isoAgo(52 * 86_400),
  },
];
