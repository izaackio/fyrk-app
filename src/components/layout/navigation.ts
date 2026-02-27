export interface NavItem {
  href: string;
  icon: string;
  label: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "▣", label: "Dashboard" },
  { href: "/balance-sheet", icon: "◔", label: "Balance Sheet" },
  { href: "/timeline", icon: "◷", label: "Timeline" },
  { href: "/events", icon: "◎", label: "Life Events" },
  { href: "/review", icon: "☰", label: "Quarterly Review" },
  { href: "/fitness", icon: "◉", label: "Financial Fitness" },
  { href: "/proposals", icon: "✎", label: "Proposals" },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/household", icon: "◌", label: "Household" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "▣", label: "Home" },
  { href: "/balance-sheet", icon: "◔", label: "Sheet" },
  { href: "/timeline", icon: "◷", label: "Timeline" },
  { href: "/proposals", icon: "✎", label: "Proposals" },
  { href: "/settings", icon: "⚙", label: "Settings" },
];
