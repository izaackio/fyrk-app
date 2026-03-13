import type { IconName } from "./icons";

export type ShellTone = "primary" | "emerging" | "support" | "preview";

export interface NavItem {
  href: string;
  icon: IconName;
  label: string;
  shortLabel: string;
  description: string;
  tone: ShellTone;
}

export interface NavSection {
  label: string;
  helper?: string;
  items: NavItem[];
}

export interface ShellPageMeta {
  title: string;
  eyebrow: string;
  summary: string;
  searchPlaceholder: string;
  tone: ShellTone;
  statusLabel: string;
}

export interface RouteExplorerItem {
  href: string;
  label: string;
  matchPrefix?: string;
}

export interface RouteExplorerGroup {
  label: string;
  items: RouteExplorerItem[];
}

const HOME_ITEM: NavItem = {
  href: "/dashboard",
  icon: "home",
  label: "Home",
  shortLabel: "Home",
  description: "Weekly brief, signal, and next decisions.",
  tone: "primary",
};

const BALANCE_SHEET_ITEM: NavItem = {
  href: "/balance-sheet",
  icon: "balanceSheet",
  label: "Balance Sheet",
  shortLabel: "Balance",
  description: "Net worth, allocation, and data quality.",
  tone: "primary",
};

const TIMELINE_ITEM: NavItem = {
  href: "/timeline",
  icon: "timeline",
  label: "Timeline",
  shortLabel: "Timeline",
  description: "A chronological view of milestones and changes.",
  tone: "emerging",
};

const PLAYBOOKS_ITEM: NavItem = {
  href: "/events",
  icon: "playbooks",
  label: "Playbooks",
  shortLabel: "Playbooks",
  description: "Life-stage operating guides for the household.",
  tone: "emerging",
};

const HOUSEHOLD_ITEM: NavItem = {
  href: "/household",
  icon: "household",
  label: "Household",
  shortLabel: "Household",
  description: "Members, roles, and shared operating context.",
  tone: "support",
};

const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  icon: "settings",
  label: "Settings",
  shortLabel: "Settings",
  description: "Preferences, privacy, and workspace defaults.",
  tone: "support",
};

const REVIEW_ITEM: NavItem = {
  href: "/review",
  icon: "review",
  label: "Quarterly Review",
  shortLabel: "Review",
  description: "Review pack and household recommendations.",
  tone: "preview",
};

const FITNESS_ITEM: NavItem = {
  href: "/fitness",
  icon: "fitness",
  label: "Financial Fitness",
  shortLabel: "Fitness",
  description: "Resilience score and improvement path.",
  tone: "preview",
};

const PROPOSALS_ITEM: NavItem = {
  href: "/proposals",
  icon: "proposals",
  label: "Proposals",
  shortLabel: "Proposals",
  description: "Shared decisions awaiting alignment.",
  tone: "preview",
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Core",
    helper: "Daily anchors",
    items: [HOME_ITEM, BALANCE_SHEET_ITEM],
  },
  {
    label: "Planning",
    helper: "Forthcoming decisions",
    items: [TIMELINE_ITEM, PLAYBOOKS_ITEM],
  },
  {
    label: "Workspace",
    helper: "Household operations",
    items: [HOUSEHOLD_ITEM, SETTINGS_ITEM],
  },
];

export const PREVIEW_NAV_SECTION: NavSection = {
  label: "Advisory Pipeline",
  helper: "Visible, but not daily-core yet",
  items: [REVIEW_ITEM, FITNESS_ITEM, PROPOSALS_ITEM],
};

export const MOBILE_NAV_ITEMS: NavItem[] = [
  HOME_ITEM,
  BALANCE_SHEET_ITEM,
  TIMELINE_ITEM,
  PLAYBOOKS_ITEM,
  HOUSEHOLD_ITEM,
];

const PAGE_META: Record<string, ShellPageMeta> = {
  "/dashboard": {
    title: "Home",
    eyebrow: "Household Brief",
    summary:
      "Start with the weekly narrative, the clearest shifts in net worth, and the next household decisions worth attention.",
    searchPlaceholder: "Search balances, accounts, or next steps",
    tone: "primary",
    statusLabel: "Primary surface",
  },
  "/balance-sheet": {
    title: "Balance Sheet",
    eyebrow: "Core Ledger",
    summary:
      "Read the household balance sheet as one operating picture across assets, liabilities, allocation, and data quality.",
    searchPlaceholder: "Search accounts, institutions, or holdings",
    tone: "primary",
    statusLabel: "Primary surface",
  },
  "/timeline": {
    title: "Timeline",
    eyebrow: "Decision History",
    summary:
      "Follow the milestones, decisions, and notable changes that shaped the household balance sheet over time.",
    searchPlaceholder: "Search milestones, notes, or turning points",
    tone: "emerging",
    statusLabel: "Expanding workflow",
  },
  "/events": {
    title: "Playbooks",
    eyebrow: "Life Decisions",
    summary:
      "Organize major household moments into practical playbooks so planning stays calm when life gets consequential.",
    searchPlaceholder: "Search playbooks, events, or preparation steps",
    tone: "emerging",
    statusLabel: "Expanding workflow",
  },
  "/household": {
    title: "Household",
    eyebrow: "Operating Model",
    summary:
      "Manage the shared structure behind the numbers, including members, roles, and collaboration boundaries.",
    searchPlaceholder: "Search members, roles, or household settings",
    tone: "support",
    statusLabel: "Support surface",
  },
  "/settings": {
    title: "Settings",
    eyebrow: "Workspace Preferences",
    summary:
      "Tune the product feel, privacy posture, and operating defaults that shape how Fyrk behaves for the household.",
    searchPlaceholder: "Search preferences, controls, or privacy settings",
    tone: "support",
    statusLabel: "Support surface",
  },
  "/review": {
    title: "Quarterly Review",
    eyebrow: "Advisory Surface",
    summary:
      "This route is reserved for structured review packs, recommendations, and export-ready household reporting.",
    searchPlaceholder: "Search review topics or recommendations",
    tone: "preview",
    statusLabel: "Preview surface",
  },
  "/fitness": {
    title: "Financial Fitness",
    eyebrow: "Advisory Surface",
    summary:
      "This route will consolidate resilience scoring, supporting factors, and the actions that improve household strength.",
    searchPlaceholder: "Search score factors or resilience topics",
    tone: "preview",
    statusLabel: "Preview surface",
  },
  "/proposals": {
    title: "Proposals",
    eyebrow: "Advisory Surface",
    summary:
      "This route is reserved for shared proposals, approvals, and household decisions that need explicit alignment.",
    searchPlaceholder: "Search proposals, approvals, or decisions",
    tone: "preview",
    statusLabel: "Preview surface",
  },
  "/onboarding": {
    title: "Household Setup",
    eyebrow: "Activation",
    summary:
      "Create the household, choose a base currency, and invite your partner so the workspace can become truly shared.",
    searchPlaceholder: "Search setup steps or household basics",
    tone: "support",
    statusLabel: "Setup flow",
  },
  "/accounts": {
    title: "Accounts",
    eyebrow: "Supporting Route",
    summary:
      "Supporting account routes stay out of the main shell until the balance sheet and import workflows are fully productized.",
    searchPlaceholder: "Search accounts or institutions",
    tone: "preview",
    statusLabel: "Supporting route",
  },
  "/import": {
    title: "Imports",
    eyebrow: "Supporting Route",
    summary:
      "Import tools remain supporting routes until account ingestion is ready to feel native inside the core product flow.",
    searchPlaceholder: "Search import jobs or source files",
    tone: "preview",
    statusLabel: "Supporting route",
  },
};

export const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export const getPageMeta = (pathname: string): ShellPageMeta => {
  const exactMatch = PAGE_META[pathname];
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = Object.entries(PAGE_META).find(([path]) =>
    path !== "/" ? pathname.startsWith(`${path}/`) : pathname === path,
  );

  if (partialMatch) {
    return partialMatch[1];
  }

  return {
    title: "Fyrk",
    eyebrow: "Household Finance OS",
    summary:
      "A calmer operating system for shared household finances, built around narrative clarity and CFO-grade inspection.",
    searchPlaceholder: "Search Fyrk",
    tone: "support",
    statusLabel: "Product shell",
  };
};

const PRODUCT_ROUTE_ITEMS: RouteExplorerItem[] = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    href: item.href,
    label: item.label,
  })),
);

const PREVIEW_ROUTE_ITEMS: RouteExplorerItem[] = PREVIEW_NAV_SECTION.items.map((item) => ({
  href: item.href,
  label: item.label,
}));

const SUPPORT_ROUTE_ITEMS: RouteExplorerItem[] = [
  { href: "/accounts", label: "Accounts" },
  { href: "/accounts/new", label: "Add Account" },
  {
    href: "/accounts/demo-account",
    label: "Account Detail (sample)",
    matchPrefix: "/accounts/",
  },
  { href: "/import", label: "Imports" },
  { href: "/onboarding", label: "Household Setup" },
];

export const ROUTE_EXPLORER_GROUPS: RouteExplorerGroup[] = [
  {
    label: "Marketing",
    items: [{ href: "/", label: "Landing Page" }],
  },
  {
    label: "Auth",
    items: [
      { href: "/signup", label: "Signup" },
      { href: "/login", label: "Login" },
      { href: "/auth", label: "Magic Link Callback" },
    ],
  },
  {
    label: "Product Shell",
    items: PRODUCT_ROUTE_ITEMS,
  },
  {
    label: "Preview Surfaces",
    items: PREVIEW_ROUTE_ITEMS,
  },
  {
    label: "Supporting Routes",
    items: SUPPORT_ROUTE_ITEMS,
  },
];
