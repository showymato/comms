import type { Policy } from "@/types";

export const POLICIES: Policy[] = [
  {
    id: "DEFAULT",
    name: "DEFAULT",
    description: "Baseline requirements for general-purpose collateral use.",
    minLiquidityUsd: 100_000,
    oracleRequired: true,
    transferRequired: true,
    redemptionRequired: true,
    createdAt: "2026-08-02T09:00:00Z",
    builtIn: true,
  },
  {
    id: "INSTITUTIONAL",
    name: "INSTITUTIONAL",
    description: "Deeper liquidity floor for larger positions.",
    minLiquidityUsd: 2_000_000,
    oracleRequired: true,
    transferRequired: true,
    redemptionRequired: true,
    createdAt: "2026-08-14T13:30:00Z",
    builtIn: false,
  },
  {
    id: "FLEXIBLE",
    name: "FLEXIBLE",
    description: "Lower liquidity floor; redemption is not a requirement.",
    minLiquidityUsd: 25_000,
    oracleRequired: true,
    transferRequired: true,
    redemptionRequired: false,
    createdAt: "2026-09-03T16:10:00Z",
    builtIn: false,
  },
];
