import { BookOpen, Boxes, CalendarClock, LayoutGrid, Radio, Settings, ShieldCheck, SlidersHorizontal, Webhook, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** additional path prefixes that keep this item active */
  also?: string[];
}

export const NAV: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/assets", label: "Assets", icon: Boxes },
  { href: "/app/eligibility", label: "Eligibility", icon: ShieldCheck },
  { href: "/app/policies", label: "Policies", icon: SlidersHorizontal },
  { href: "/app/events", label: "Events", icon: Radio },
  { href: "/app/corporate-actions", label: "Corp. actions", icon: CalendarClock },
  { href: "/app/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/app/workspace", label: "Workspace", icon: Wallet },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

/** Docs live outside the app shell. */
export const SDK_ITEM: NavItem = { href: "/developers", label: "Developers", icon: BookOpen };

export const isActive = (pathname: string, item: NavItem) =>
  item.href === "/app"
    ? pathname === "/app"
    : pathname === item.href || pathname.startsWith(item.href + "/") || (item.also ?? []).some((p) => pathname === p || pathname.startsWith(p + "/"));
