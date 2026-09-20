import { BookOpen, Boxes, FileCode2, LayoutGrid, Radio, Settings, ShieldCheck, SlidersHorizontal, Webhook, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** additional path prefixes that keep this item active */
  also?: string[];
}

export const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/eligibility", label: "Eligibility", icon: ShieldCheck },
  { href: "/policies", label: "Policies", icon: SlidersHorizontal },
  { href: "/events", label: "Events", icon: Radio },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/api-reference", label: "API", icon: BookOpen, also: ["/sdk"] },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const SDK_ITEM: NavItem = { href: "/sdk", label: "SDK", icon: FileCode2 };

export const isActive = (pathname: string, item: NavItem) =>
  pathname === item.href || pathname.startsWith(item.href + "/") || (item.also ?? []).some((p) => pathname === p || pathname.startsWith(p + "/"));
