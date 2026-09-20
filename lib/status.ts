import type { CheckResult, EligibilityStatus, ReasonCode } from "@/types";

export interface StatusMeta {
  label: string;
  /** Accessible description — status is never conveyed by colour alone. */
  sr: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  ring: string;
  hex: string;
}

/** Full class strings so Tailwind can see them statically. */
export const STATUS: Record<EligibilityStatus, StatusMeta> = {
  ELIGIBLE: {
    label: "ELIGIBLE",
    sr: "Eligible as collateral",
    text: "text-eligible",
    bg: "bg-eligible/10",
    border: "border-eligible/30",
    dot: "bg-eligible",
    ring: "ring-eligible/40",
    hex: "#39E58C",
  },
  INELIGIBLE: {
    label: "INELIGIBLE",
    sr: "Ineligible as collateral",
    text: "text-ineligible",
    bg: "bg-ineligible/10",
    border: "border-ineligible/30",
    dot: "bg-ineligible",
    ring: "ring-ineligible/40",
    hex: "#FF6B6B",
  },
  CONDITIONAL: {
    label: "CONDITIONAL",
    sr: "Conditionally eligible: a policy threshold is not met",
    text: "text-conditional",
    bg: "bg-conditional/10",
    border: "border-conditional/30",
    dot: "bg-conditional",
    ring: "ring-conditional/40",
    hex: "#FFB84D",
  },
  UNKNOWN: {
    label: "UNKNOWN",
    sr: "Unknown: insufficient evidence to decide",
    text: "text-unknown",
    bg: "bg-unknown/10",
    border: "border-unknown/30",
    dot: "bg-unknown",
    ring: "ring-unknown/40",
    hex: "#8FA3BF",
  },
};

export const STATUS_ORDER: EligibilityStatus[] = ["ELIGIBLE", "CONDITIONAL", "UNKNOWN", "INELIGIBLE"];

export const CHECK_STATUS: Record<CheckResult, EligibilityStatus> = {
  PASS: "ELIGIBLE",
  FAIL: "INELIGIBLE",
  UNKNOWN: "UNKNOWN",
};

export const REASON_TEXT: Record<ReasonCode, string> = {
  ALL_CHECKS_PASSED: "Every required check passed against the policy.",
  ASSET_INACTIVE: "The asset is not active.",
  TRANSFER_DISABLED: "Transfers are disabled on the token contract.",
  ORACLE_UNHEALTHY: "The price oracle reports an unhealthy state.",
  PRICE_STALE: "The latest price update is outside the freshness window.",
  REDEMPTION_DISABLED: "Redemption is not available.",
  TOKEN_PAUSED: "The token contract is paused.",
  TRANSFER_RESTRICTED: "Transfers are restricted on the token.",
  ISSUER_RESTRICTION: "The issuer has placed a restriction on the token.",
  COLLATERAL_UNSUPPORTED: "The asset is not supported as collateral.",
  LIQUIDITY_BELOW_MINIMUM: "Liquidity is below the policy minimum.",
  INSUFFICIENT_EVIDENCE: "Required evidence is missing. COMMS does not guess.",
  TRANSFER_REENABLED: "Transfers were re-enabled.",
  ORACLE_RECOVERED: "Oracle data is available again.",
  ASSET_REACTIVATED: "The asset was reactivated.",
};
