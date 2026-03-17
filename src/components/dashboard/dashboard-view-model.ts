import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
} from "../accounts/formatters";
import type { AccountSyncSource } from "../accounts/contracts";
import type {
  AllocationSlice,
  DashboardInsights,
  WeeklyNetWorthDelta,
} from "../balance-sheet/insights";

export type DashboardIntent = "positive" | "neutral" | "warning" | "info";

export interface DashboardAction {
  ctaLabel: string;
  description: string;
  eyebrow: string;
  href?: string;
  intent: DashboardIntent;
  kind: "link" | "refresh";
  title: string;
}

export interface DashboardMetric {
  detail: string;
  intent: DashboardIntent;
  label: string;
  value: string;
}

export interface DashboardTimelineEntry {
  detail: string;
  intent: DashboardIntent;
  label: string;
  title: string;
}

export interface DashboardMilestone {
  detail: string;
  intent: DashboardIntent;
  title: string;
}

export interface DashboardTrustSummary {
  badge: string;
  detail: string;
  intent: DashboardIntent;
  summary: string;
}

export interface DashboardNarrativeSummary {
  modeLabel: string;
  trustNote: string;
}

export interface DashboardHeroSummary {
  detail: string;
  footer: string;
  summary: string;
  trendLabel: string;
  trendIntent: DashboardIntent;
  value: string;
}

export interface DashboardViewModel {
  actions: DashboardAction[];
  hero: DashboardHeroSummary;
  heroMetrics: DashboardMetric[];
  milestones: DashboardMilestone[];
  narrative: DashboardNarrativeSummary;
  statuses: DashboardMetric[];
  timeline: DashboardTimelineEntry[];
  trust: DashboardTrustSummary;
}

const SYNC_SOURCE_LABELS: Record<AccountSyncSource, string> = {
  csv: "CSV import",
  manual: "Manual entry",
  provider: "Provider sync",
};

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${formatNumber(count, 0)} ${count === 1 ? singular : plural}`;

const toFreshnessIntent = (
  level: DashboardInsights["snapshot"]["freshness"]["level"],
): DashboardIntent => {
  if (level === "fresh") {
    return "positive";
  }

  if (level === "aged") {
    return "info";
  }

  if (level === "stale") {
    return "warning";
  }

  return "neutral";
};

const toFreshnessBadge = (
  level: DashboardInsights["snapshot"]["freshness"]["level"],
): string => {
  if (level === "fresh") {
    return "Fresh data";
  }

  if (level === "aged") {
    return "Aged data";
  }

  if (level === "stale") {
    return "Stale data";
  }

  return "Freshness unknown";
};

const buildWeeklyTrend = (
  weeklyDelta: WeeklyNetWorthDelta,
  currency: string,
): { detail: string; intent: DashboardIntent; summary: string } => {
  if (weeklyDelta.amount === null) {
    return {
      detail: "Weekly comparison becomes available once Fyrk has another historical snapshot to compare against.",
      intent: "neutral",
      summary: "Weekly comparison forming",
    };
  }

  if (weeklyDelta.amount === 0) {
    return {
      detail: "The household held broadly steady across the latest weekly window.",
      intent: "neutral",
      summary: "Flat vs last week",
    };
  }

  const direction = weeklyDelta.amount > 0 ? "Up" : "Down";
  const amountLabel = formatMoney(Math.abs(weeklyDelta.amount), currency);
  const pctLabel =
    weeklyDelta.pct === null ? "" : ` (${formatPercent(Math.abs(weeklyDelta.pct))})`;

  return {
    detail: `${direction} ${amountLabel}${pctLabel} versus the previous weekly snapshot.`,
    intent: weeklyDelta.amount > 0 ? "positive" : "warning",
    summary: `${direction} ${amountLabel}${pctLabel} vs last week`,
  };
};

const buildHeroSummary = (insights: DashboardInsights): DashboardHeroSummary => {
  const { snapshot, weeklyDelta } = insights;
  const trend = buildWeeklyTrend(weeklyDelta, snapshot.currency);
  const leadingAllocation = snapshot.allocation.assetClass[0];
  const detail = leadingAllocation
    ? `${leadingAllocation.label} remains the largest allocation at ${formatPercent(leadingAllocation.pct)} of household assets.`
    : "Allocation detail will sharpen as holdings data fills in.";
  const footer = `Assets ${formatMoney(snapshot.totalAssets, snapshot.currency)} · Liabilities ${formatMoney(snapshot.totalLiabilities, snapshot.currency)}`;

  return {
    detail,
    footer,
    summary: trend.detail,
    trendIntent: trend.intent,
    trendLabel: trend.summary,
    value: formatMoney(snapshot.totalNetWorth, snapshot.currency),
  };
};

const buildHeroMetrics = (insights: DashboardInsights): DashboardMetric[] => {
  const { snapshot } = insights;
  const primaryAccountType = snapshot.byAccountType[0];
  const memberCount = snapshot.members.length;
  const liabilitiesPct =
    snapshot.totalAssets > 0 && snapshot.totalLiabilities > 0
      ? (snapshot.totalLiabilities / snapshot.totalAssets) * 100
      : 0;

  return [
    {
      detail: primaryAccountType
        ? `${primaryAccountType.label} is the largest account type in the picture.`
        : `${pluralize(snapshot.accountsCount, "account")} currently shape the home.`,
      intent: "neutral",
      label: "Assets",
      value: formatMoney(snapshot.totalAssets, snapshot.currency),
    },
    {
      detail:
        snapshot.totalLiabilities > 0
          ? `${formatPercent(liabilitiesPct)} of assets are offset by liabilities.`
          : "No liabilities are currently represented in the household picture.",
      intent: snapshot.totalLiabilities > 0 ? "warning" : "positive",
      label: "Liabilities",
      value: formatMoney(snapshot.totalLiabilities, snapshot.currency),
    },
    {
      detail: snapshot.freshness.message,
      intent: toFreshnessIntent(snapshot.freshness.level),
      label: "Coverage",
      value: formatPercent(snapshot.freshness.coveragePct),
    },
    {
      detail: `${pluralize(memberCount, "member")} represented in the current household view.`,
      intent: "info",
      label: "Household",
      value: pluralize(snapshot.accountsCount, "account"),
    },
  ];
};

const buildTrustSummary = (insights: DashboardInsights): DashboardTrustSummary => {
  const { snapshot } = insights;
  const sourceLabel = SYNC_SOURCE_LABELS[snapshot.freshness.primarySyncSource];
  const detail = snapshot.freshness.lastFullUpdate
    ? `Last full update ${formatDateTime(snapshot.freshness.lastFullUpdate)} via ${sourceLabel}.`
    : `No full update timestamp yet. Current primary source: ${sourceLabel}.`;

  return {
    badge: toFreshnessBadge(snapshot.freshness.level),
    detail,
    intent: toFreshnessIntent(snapshot.freshness.level),
    summary: snapshot.freshness.message,
  };
};

const buildNarrativeSummary = (insights: DashboardInsights): DashboardNarrativeSummary => {
  const { snapshot, weeklyNarrative } = insights;

  if (weeklyNarrative.source === "ai") {
    return {
      modeLabel: "AI narrative",
      trustNote: `Narrative mode is grounded in the latest household balances. ${snapshot.freshness.message}`,
    };
  }

  return {
    modeLabel: "Structured summary",
    trustNote:
      "Narrative mode is using a deterministic brief built from current balances while AI is unavailable.",
  };
};

const buildPrimaryAction = (insights: DashboardInsights): DashboardAction => {
  const { snapshot, weeklyDelta, weeklyNarrative } = insights;

  if (snapshot.freshness.staleAccounts > 0) {
    return {
      ctaLabel: "Review accounts",
      description: `${pluralize(snapshot.freshness.staleAccounts, "account")} are stale. Fresh values will sharpen the weekly brief and improve trust in the household picture.`,
      eyebrow: "Priority action",
      href: "/accounts",
      intent: "warning",
      kind: "link",
      title: "Refresh stale accounts",
    };
  }

  if (snapshot.freshness.coveragePct < 100) {
    return {
      ctaLabel: "Import more data",
      description: `Coverage is currently ${formatPercent(snapshot.freshness.coveragePct)}. Bring the remaining balances in so the home reflects the full household picture.`,
      eyebrow: "Priority action",
      href: "/import",
      intent: "info",
      kind: "link",
      title: "Complete the household picture",
    };
  }

  if (weeklyNarrative.source === "fallback") {
    return {
      ctaLabel: "Refresh brief",
      description: "The page is using a structured summary right now. Retry the brief when you want Fyrk to attempt the AI narrative again.",
      eyebrow: "Priority action",
      intent: "neutral",
      kind: "refresh",
      title: "Retry the weekly brief",
    };
  }

  if (weeklyDelta.amount === null) {
    return {
      ctaLabel: "Open balance sheet",
      description: "The home is live, but week-over-week context needs another historical point. Keep the ledger current and Fyrk will establish the baseline automatically.",
      eyebrow: "Priority action",
      href: "/balance-sheet",
      intent: "neutral",
      kind: "link",
      title: "Let the first weekly baseline form",
    };
  }

  return {
    ctaLabel: "Inspect balances",
    description: "Open the balance sheet to see which accounts and exposures are doing the work underneath this week's change.",
    eyebrow: "Priority action",
    href: "/balance-sheet",
    intent: weeklyDelta.amount > 0 ? "positive" : "info",
    kind: "link",
    title: "Trace the move underneath the headline",
  };
};

const buildSecondaryAction = (insights: DashboardInsights): DashboardAction => {
  const { snapshot } = insights;
  const leadingAllocation = snapshot.allocation.assetClass[0];

  if (!leadingAllocation) {
    return {
      ctaLabel: "Import holdings",
      description: "Fyrk can already read balances, but holdings detail is still too light to explain the shape of the portfolio with confidence.",
      eyebrow: "Household follow-through",
      href: "/import",
      intent: "info",
      kind: "link",
      title: "Sharpen allocation detail",
    };
  }

  if (snapshot.accountsCount < 2) {
    return {
      ctaLabel: "Add another account",
      description: "One account can establish the home, but a fuller picture emerges when more of the household balance sheet is represented.",
      eyebrow: "Household follow-through",
      href: "/accounts/new",
      intent: "neutral",
      kind: "link",
      title: "Broaden the home beyond the first account",
    };
  }

  return {
    ctaLabel: "Open household",
    description: "Use the household workspace to confirm who belongs in the picture and keep the shared operating model aligned with reality.",
    eyebrow: "Household follow-through",
    href: "/household",
    intent: "info",
    kind: "link",
    title: "Keep the household structure aligned",
  };
};

const buildStatusCards = (insights: DashboardInsights): DashboardMetric[] => {
  const { snapshot } = insights;
  const leadingAllocation = snapshot.allocation.assetClass[0];
  const leadingAccountType = snapshot.byAccountType[0];
  const liabilitiesPct =
    snapshot.totalAssets > 0 && snapshot.totalLiabilities > 0
      ? (snapshot.totalLiabilities / snapshot.totalAssets) * 100
      : 0;

  return [
    {
      detail: leadingAllocation
        ? `${formatPercent(leadingAllocation.pct)} of household assets.`
        : "Holdings data is still too light to show a clear allocation leader.",
      intent: leadingAllocation ? "positive" : "neutral",
      label: "Largest allocation",
      value: leadingAllocation?.label ?? "Limited detail",
    },
    {
      detail: leadingAccountType
        ? formatMoney(leadingAccountType.value, snapshot.currency)
        : "Account mix becomes clearer as more balances land.",
      intent: "neutral",
      label: "Largest account type",
      value: leadingAccountType?.label ?? "Early picture",
    },
    {
      detail: `${pluralize(snapshot.accountsCount, "account")} are contributing to the current home view.`,
      intent: "info",
      label: "Members represented",
      value: pluralize(snapshot.members.length, "member"),
    },
    {
      detail:
        snapshot.totalLiabilities > 0
          ? `${formatPercent(liabilitiesPct)} of assets are currently offset by liabilities.`
          : "The current picture is asset-only.",
      intent: snapshot.totalLiabilities > 0 ? "warning" : "positive",
      label: "Liability posture",
      value: snapshot.totalLiabilities > 0 ? formatPercent(liabilitiesPct) : "Debt-free",
    },
  ];
};

const buildTimelineEntries = (insights: DashboardInsights): DashboardTimelineEntry[] => {
  const { snapshot, weeklyDelta, weeklyNarrative } = insights;
  const trend = buildWeeklyTrend(weeklyDelta, snapshot.currency);

  return [
    {
      detail: snapshot.freshness.message,
      intent: toFreshnessIntent(snapshot.freshness.level),
      label: "Latest picture",
      title: snapshot.asOfDate ? formatDateTime(snapshot.asOfDate) : "Waiting for the first sync timestamp",
    },
    {
      detail: trend.detail,
      intent: trend.intent,
      label: "Weekly window",
      title:
        weeklyDelta.startDate && weeklyDelta.endDate
          ? `${formatDate(weeklyDelta.startDate)} to ${formatDate(weeklyDelta.endDate)}`
          : "Weekly comparison forming",
    },
    {
      detail: weeklyNarrative.sourceMessage,
      intent: weeklyNarrative.source === "ai" ? "info" : "neutral",
      label: "Narrative refreshed",
      title: formatDateTime(weeklyNarrative.generatedAt),
    },
  ];
};

const buildMilestones = (insights: DashboardInsights): DashboardMilestone[] => {
  const { snapshot, weeklyDelta, weeklyNarrative } = insights;
  const leadingAllocation: AllocationSlice | undefined = snapshot.allocation.assetClass[0];

  return [
    snapshot.freshness.staleAccounts > 0
      ? {
          detail: `Refresh ${pluralize(snapshot.freshness.staleAccounts, "stale account")} to bring the home back into current trust range.`,
          intent: "warning",
          title: "Restore freshness",
        }
      : {
          detail: "The picture is current. Regular syncs will keep the weekly home dependable and easy to trust.",
          intent: "positive",
          title: "Keep the picture fresh",
        },
    weeklyDelta.amount === null
      ? {
          detail: "The first week-over-week comparison appears once another historical snapshot lands.",
          intent: "neutral",
          title: "Unlock week-over-week context",
        }
      : {
          detail: `The next brief will measure movement after ${formatDate(weeklyDelta.endDate ?? weeklyNarrative.generatedAt)}.`,
          intent: "info",
          title: "Prepare the next weekly brief",
        },
    weeklyNarrative.source === "fallback"
      ? {
          detail: "Fyrk is using a structured summary until the AI narrative service is available again.",
          intent: "neutral",
          title: "Return to the AI brief",
        }
      : leadingAllocation
        ? {
            detail: `${leadingAllocation.label} is leading today. Keep coverage current so any shift stays visible before it becomes a surprise.`,
            intent: "positive",
            title: "Maintain visibility on the biggest exposure",
          }
        : {
            detail: "Importing holdings detail will make the household picture more analytical without losing calm readability.",
            intent: "info",
            title: "Deepen allocation detail",
          },
  ];
};

export function buildDashboardViewModel(
  insights: DashboardInsights,
): DashboardViewModel {
  return {
    actions: [buildPrimaryAction(insights), buildSecondaryAction(insights)],
    hero: buildHeroSummary(insights),
    heroMetrics: buildHeroMetrics(insights),
    milestones: buildMilestones(insights),
    narrative: buildNarrativeSummary(insights),
    statuses: buildStatusCards(insights),
    timeline: buildTimelineEntries(insights),
    trust: buildTrustSummary(insights),
  };
}
