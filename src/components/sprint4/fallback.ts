import {
  loadBalanceSheetSnapshot,
  loadWeeklyNetWorthDelta,
} from "../balance-sheet/insights";
import {
  type EventLibraryItem,
  type FitnessComponent,
  type FitnessHistoryPoint,
  type FitnessPayload,
  type LifeEvent,
  type LifeEventType,
  type PlaybookAction,
  type PlaybookActionCategory,
  type PlaybookActionPriority,
  type PlaybookActionStatus,
  type TimelineActor,
  type TimelineCategory,
  type TimelineEntry,
  type TimelineEntryType,
  type TimelineFilters,
  type TriggerLifeEventRequest,
  type UpdatePlaybookActionRequest,
  type UpdateTimelineEntryRequest,
} from "./contracts";
import { ApiClientError } from "./http";

const STORAGE_KEY = "fyrk:sprint4:planning-state";
const API_DELAY_MS = 260;

const LIQUID_ACCOUNT_TYPES = new Set(["cash", "savings"]);
const GROWTH_ACCOUNT_TYPES = new Set(["investment", "pension"]);

interface HouseholdState {
  events: LifeEvent[];
  fitnessHistory: FitnessHistoryPoint[];
  timelineEntries: TimelineEntry[];
}

interface Sprint4State {
  households: Record<string, HouseholdState>;
}

const DEFAULT_STATE: Sprint4State = {
  households: {},
};

interface PlaybookTemplate {
  category: PlaybookActionCategory;
  description: string;
  dueDaysFromTarget: number;
  estimatedImpactDescription: string;
  priority: PlaybookActionPriority;
  title: string;
}

const PLAYBOOK_TEMPLATES_BY_EVENT: Record<LifeEventType, PlaybookTemplate[]> = {
  buying_apartment: [
    {
      category: "financial",
      description:
        "Stress-test borrowing capacity with one conservative and one optimistic income scenario.",
      dueDaysFromTarget: -180,
      estimatedImpactDescription: "Prevents bidding outside affordable range.",
      priority: "critical",
      title: "Calculate mortgage capacity",
    },
    {
      category: "financial",
      description:
        "Set transfer cadence to a dedicated account to reach 15% down payment plus closing costs.",
      dueDaysFromTarget: -165,
      estimatedImpactDescription: "Improves purchase readiness and buffer score.",
      priority: "critical",
      title: "Lock in down-payment plan",
    },
    {
      category: "planning",
      description:
        "Run monthly cost simulations for interest rates at 3%, 5%, and 7%.",
      dueDaysFromTarget: -140,
      estimatedImpactDescription: "Clarifies post-purchase cash-flow risk.",
      priority: "high",
      title: "Model housing cash-flow scenarios",
    },
    {
      category: "insurance",
      description:
        "Validate life and income coverage so both partners can carry housing costs independently.",
      dueDaysFromTarget: -120,
      estimatedImpactDescription: "Reduces protection gap tied to mortgage exposure.",
      priority: "high",
      title: "Review life and income insurance",
    },
    {
      category: "financial",
      description:
        "Compare variable/fixed split and amortization alternatives from at least two lenders.",
      dueDaysFromTarget: -110,
      estimatedImpactDescription: "Can lower monthly mortgage burden.",
      priority: "high",
      title: "Collect lender offers",
    },
    {
      category: "tax",
      description:
        "Prepare expected tax deductions, transaction costs, and moving expenses in advance.",
      dueDaysFromTarget: -90,
      estimatedImpactDescription: "Improves net cash forecast accuracy.",
      priority: "medium",
      title: "Map housing tax effects",
    },
    {
      category: "legal",
      description:
        "Draft ownership agreement and decision rules for major renovations or resale decisions.",
      dueDaysFromTarget: -70,
      estimatedImpactDescription: "Reduces legal and relationship friction risk.",
      priority: "high",
      title: "Draft co-ownership agreement",
    },
    {
      category: "planning",
      description:
        "Create 6-month post-move budget including one-off costs and fallback liquidity rules.",
      dueDaysFromTarget: -45,
      estimatedImpactDescription: "Protects emergency buffer during move period.",
      priority: "medium",
      title: "Build move-period budget",
    },
    {
      category: "financial",
      description:
        "Document final decision rationale with bid ceiling and no-go conditions before bidding starts.",
      dueDaysFromTarget: -30,
      estimatedImpactDescription: "Supports disciplined decision-making.",
      priority: "medium",
      title: "Set bidding guardrails",
    },
    {
      category: "planning",
      description:
        "Schedule first post-purchase review to compare actual vs planned housing and savings outcomes.",
      dueDaysFromTarget: 30,
      estimatedImpactDescription: "Creates accountability loop and faster course correction.",
      priority: "low",
      title: "Book 90-day housing review",
    },
  ],
  changing_jobs: [
    {
      category: "financial",
      description:
        "Calculate post-tax net salary difference and update household savings targets.",
      dueDaysFromTarget: -30,
      estimatedImpactDescription: "Aligns growth rate expectations with new income.",
      priority: "critical",
      title: "Model post-tax income impact",
    },
    {
      category: "insurance",
      description: "Review employer benefits, pension level, and private coverage gaps.",
      dueDaysFromTarget: -20,
      estimatedImpactDescription: "Avoids temporary protection gaps.",
      priority: "high",
      title: "Review benefits and protection",
    },
    {
      category: "planning",
      description:
        "Define first-90-day spending guardrails until income and bonus cadence stabilizes.",
      dueDaysFromTarget: -5,
      estimatedImpactDescription: "Preserves liquidity during transition.",
      priority: "medium",
      title: "Create transition budget",
    },
  ],
  divorce: [
    {
      category: "legal",
      description: "Document asset ownership, debt split, and immediate legal timeline.",
      dueDaysFromTarget: -14,
      estimatedImpactDescription: "Reduces legal ambiguity in settlement phase.",
      priority: "critical",
      title: "Prepare legal asset inventory",
    },
    {
      category: "financial",
      description:
        "Set personal emergency-fund target and separate recurring obligations.",
      dueDaysFromTarget: -10,
      estimatedImpactDescription: "Improves individual buffer resilience.",
      priority: "high",
      title: "Rebuild personal cash buffer",
    },
    {
      category: "planning",
      description:
        "Create 6-month standalone spending plan and update account ownership.",
      dueDaysFromTarget: 10,
      estimatedImpactDescription: "Stabilizes post-separation cash flow.",
      priority: "high",
      title: "Set independent financial plan",
    },
  ],
  having_child: [
    {
      category: "financial",
      description:
        "Model parental leave income path and required monthly buffer before due date.",
      dueDaysFromTarget: -120,
      estimatedImpactDescription: "Protects liquidity through parental leave.",
      priority: "critical",
      title: "Plan parental-leave cash flow",
    },
    {
      category: "insurance",
      description: "Review child and income protection coverage levels.",
      dueDaysFromTarget: -90,
      estimatedImpactDescription: "Reduces family protection risk.",
      priority: "high",
      title: "Update family insurance coverage",
    },
    {
      category: "planning",
      description:
        "Rebalance monthly spending plan for childcare and household support costs.",
      dueDaysFromTarget: -45,
      estimatedImpactDescription: "Maintains savings trajectory after birth.",
      priority: "medium",
      title: "Rework household budget",
    },
  ],
  inheritance: [
    {
      category: "tax",
      description: "Review inheritance tax implications and account transfer deadlines.",
      dueDaysFromTarget: -20,
      estimatedImpactDescription: "Avoids avoidable tax leakage.",
      priority: "critical",
      title: "Assess tax and transfer rules",
    },
    {
      category: "financial",
      description:
        "Split inheritance into buffer, debt reduction, and long-term investment buckets.",
      dueDaysFromTarget: -5,
      estimatedImpactDescription: "Turns one-off capital into long-term stability.",
      priority: "high",
      title: "Allocate inheritance capital",
    },
    {
      category: "planning",
      description:
        "Document agreed use cases and review decision with both household members.",
      dueDaysFromTarget: 14,
      estimatedImpactDescription: "Improves decision transparency and alignment.",
      priority: "medium",
      title: "Record inheritance decision",
    },
  ],
  marriage: [
    {
      category: "legal",
      description: "Review marital property framework and account ownership implications.",
      dueDaysFromTarget: -90,
      estimatedImpactDescription: "Clarifies household legal structure.",
      priority: "high",
      title: "Set legal ownership baseline",
    },
    {
      category: "financial",
      description:
        "Merge long-term goals into one joint target plan with annual contribution levels.",
      dueDaysFromTarget: -60,
      estimatedImpactDescription: "Improves growth and coordination.",
      priority: "high",
      title: "Align long-term savings strategy",
    },
    {
      category: "insurance",
      description:
        "Update beneficiaries, emergency contacts, and key insurance beneficiaries.",
      dueDaysFromTarget: -15,
      estimatedImpactDescription: "Improves protection readiness.",
      priority: "medium",
      title: "Refresh beneficiary setup",
    },
  ],
  retirement: [
    {
      category: "financial",
      description:
        "Estimate sustainable withdrawal rate with conservative market-return assumptions.",
      dueDaysFromTarget: -180,
      estimatedImpactDescription: "Reduces longevity and sequence-of-return risk.",
      priority: "critical",
      title: "Model retirement drawdown path",
    },
    {
      category: "tax",
      description: "Sequence pension wrappers and taxable accounts for tax-efficient withdrawals.",
      dueDaysFromTarget: -120,
      estimatedImpactDescription: "Improves net retirement income.",
      priority: "high",
      title: "Design tax-efficient withdrawal order",
    },
    {
      category: "planning",
      description: "Define annual review cadence for spending, allocation, and health costs.",
      dueDaysFromTarget: -30,
      estimatedImpactDescription: "Creates steady adjustment loop.",
      priority: "medium",
      title: "Schedule annual retirement review",
    },
  ],
};

const EVENT_LIBRARY: EventLibraryItem[] = [
  {
    available: true,
    category: "housing",
    description:
      "Plan your first home purchase with a practical, sequenced financial checklist.",
    eventType: "buying_apartment",
    requiredInputs: [
      {
        hint: "Enter total purchase budget in SEK.",
        key: "budget",
        label: "Budget (SEK)",
        options: [],
        required: true,
        type: "currency",
      },
      {
        hint: "Used to tailor regional assumptions.",
        key: "city",
        label: "City",
        options: ["Stockholm", "Gothenburg", "Malmö", "Other"],
        required: true,
        type: "select",
      },
      {
        hint: "Expected move-in or purchase date.",
        key: "targetDate",
        label: "Target date",
        options: [],
        required: true,
        type: "date",
      },
    ],
    title: "Buying an apartment",
  },
  {
    available: true,
    category: "family",
    description:
      "Prepare cash flow, coverage, and savings capacity for parental leave and childcare.",
    eventType: "having_child",
    requiredInputs: [
      {
        hint: "Expected due date.",
        key: "targetDate",
        label: "Due date",
        options: [],
        required: true,
        type: "date",
      },
      {
        hint: "Monthly expected childcare cost in SEK.",
        key: "monthlyChildcareCost",
        label: "Expected childcare cost (SEK)",
        options: [],
        required: false,
        type: "currency",
      },
    ],
    title: "Having a child",
  },
  {
    available: true,
    category: "career",
    description: "Forecast salary shift, pension changes, and near-term savings adjustments.",
    eventType: "changing_jobs",
    requiredInputs: [
      {
        hint: "New gross monthly salary in SEK.",
        key: "newSalary",
        label: "New salary (SEK/month)",
        options: [],
        required: true,
        type: "currency",
      },
      {
        hint: "When the new role starts.",
        key: "targetDate",
        label: "Start date",
        options: [],
        required: true,
        type: "date",
      },
    ],
    title: "Changing jobs",
  },
  {
    available: true,
    category: "other",
    description: "Plan tax handling and long-term allocation for a capital windfall.",
    eventType: "inheritance",
    requiredInputs: [
      {
        hint: "Estimated inheritance amount in SEK.",
        key: "amount",
        label: "Expected amount (SEK)",
        options: [],
        required: true,
        type: "currency",
      },
      {
        hint: "Expected settlement date.",
        key: "targetDate",
        label: "Settlement date",
        options: [],
        required: false,
        type: "date",
      },
    ],
    title: "Inheritance",
  },
  {
    available: true,
    category: "planning",
    description: "Model drawdown strategy, tax order, and long-horizon risk controls.",
    eventType: "retirement",
    requiredInputs: [
      {
        hint: "Target retirement date.",
        key: "targetDate",
        label: "Retirement date",
        options: [],
        required: true,
        type: "date",
      },
    ],
    title: "Retirement",
  },
  {
    available: true,
    category: "family",
    description: "Align legal, savings, and protection setup around household structure changes.",
    eventType: "marriage",
    requiredInputs: [
      {
        hint: "Ceremony date or legal registration date.",
        key: "targetDate",
        label: "Date",
        options: [],
        required: false,
        type: "date",
      },
    ],
    title: "Marriage",
  },
  {
    available: true,
    category: "family",
    description: "Stabilize finances and legal ownership during household split transitions.",
    eventType: "divorce",
    requiredInputs: [
      {
        hint: "Planned legal filing date.",
        key: "targetDate",
        label: "Filing date",
        options: [],
        required: false,
        type: "date",
      },
    ],
    title: "Divorce",
  },
];

const DEFAULT_ACTOR: TimelineActor = {
  displayName: "Household member",
  id: "local-member",
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return randomId;
  }

  return `s4-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseDate = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const toDateOnly = (value: Date): string => value.toISOString().slice(0, 10);

const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
};

const dateWithOffset = (date: Date, days: number): string => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return toDateOnly(copy);
};

const getEventLabel = (eventType: LifeEventType): string => {
  const found = EVENT_LIBRARY.find((item) => item.eventType === eventType);
  return found?.title ?? "Life event";
};

const parseBudgetMinorUnits = (inputs: Record<string, string | number | null>): number | null => {
  const budget = inputs.budget;

  if (typeof budget === "number" && Number.isFinite(budget) && budget > 0) {
    return Math.round(budget);
  }

  if (typeof budget === "string") {
    const digits = Number(budget.replaceAll(/[^\d.-]+/g, ""));
    if (Number.isFinite(digits) && digits > 0) {
      return Math.round(digits);
    }
  }

  return null;
};

const computePlaybookProgress = (
  actions: PlaybookAction[],
): LifeEvent["progress"] => {
  const completed = actions.filter((action) => action.status === "completed").length;
  const skipped = actions.filter((action) => action.status === "skipped").length;
  const total = actions.length;
  const pct = total === 0 ? 0 : Math.round(((completed + skipped) / total) * 100);

  return {
    completed,
    pct,
    skipped,
    total,
  };
};

const parseIsoDateOrFallback = (value: string | null | undefined, fallback: string): Date => {
  if (!value) {
    return new Date(fallback);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(fallback);
  }

  return parsed;
};

const buildPlaybook = (
  eventType: LifeEventType,
  targetDate: string | null,
): PlaybookAction[] => {
  const templates = PLAYBOOK_TEMPLATES_BY_EVENT[eventType] ?? PLAYBOOK_TEMPLATES_BY_EVENT.buying_apartment;
  const target = parseIsoDateOrFallback(targetDate, daysFromNow(120));

  return templates.map((template, index) => ({
    assignedTo: null,
    assignedToLabel: null,
    category: template.category,
    completedAt: null,
    description: template.description,
    dueDate: dateWithOffset(target, template.dueDaysFromTarget),
    estimatedImpactDescription: template.estimatedImpactDescription,
    id: createId(),
    priority: template.priority,
    status: index === 0 ? "completed" : "pending",
    title: template.title,
  }));
};

const buildImpactSummary = (
  eventType: LifeEventType,
  inputs: Record<string, string | number | null>,
): { impactData: LifeEvent["impactData"]; impactSummary: string } => {
  const budget = parseBudgetMinorUnits(inputs);

  if (eventType === "buying_apartment" && budget) {
    const downPaymentRequired = Math.round(budget * 0.15);
    const mortgagePrincipal = Math.max(0, budget - downPaymentRequired);
    const monthlyMortgageCost = Math.round((mortgagePrincipal * 0.0475) / 12);

    return {
      impactData: {
        downPaymentRequired,
        fitnessScoreImpact: -32,
        monthlyMortgageCost,
        netWorthImpactPct: -11.2,
      },
      impactSummary:
        "A home purchase can materially lower short-term liquidity while increasing long-term ownership stability.",
    };
  }

  if (eventType === "changing_jobs") {
    return {
      impactData: {
        downPaymentRequired: null,
        fitnessScoreImpact: 18,
        monthlyMortgageCost: null,
        netWorthImpactPct: 3.5,
      },
      impactSummary:
        "Income transition can improve growth trajectory if spending does not scale equally fast.",
    };
  }

  if (eventType === "having_child") {
    return {
      impactData: {
        downPaymentRequired: null,
        fitnessScoreImpact: -14,
        monthlyMortgageCost: null,
        netWorthImpactPct: -2.4,
      },
      impactSummary:
        "Parental leave and childcare costs can compress monthly savings unless pre-funded.",
    };
  }

  return {
    impactData: {
      downPaymentRequired: null,
      fitnessScoreImpact: -6,
      monthlyMortgageCost: null,
      netWorthImpactPct: -1.2,
    },
    impactSummary:
      "This event shifts household priorities and should be tracked with concrete financial actions.",
  };
};

const toTimelineEntry = ({
  actor,
  category,
  description,
  entryDate,
  entryType,
  householdId,
  linkedEvent,
  title,
}: {
  actor: TimelineActor;
  category: TimelineCategory;
  description: string | null;
  entryDate: string;
  entryType: TimelineEntryType;
  householdId: string;
  linkedEvent: TimelineEntry["linkedEvent"];
  title: string;
}): TimelineEntry => {
  const now = new Date().toISOString();
  const today = toDateOnly(new Date());

  return {
    category,
    createdAt: now,
    createdBy: actor,
    description,
    entryDate,
    entryType,
    householdId,
    id: createId(),
    isFuture: entryDate > today,
    linkedEvent,
    title,
  };
};

const sortTimelineEntries = (entries: TimelineEntry[]): TimelineEntry[] =>
  [...entries].sort((left, right) => {
    const dateCompare = right.entryDate.localeCompare(left.entryDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });

const sortLifeEvents = (events: LifeEvent[]): LifeEvent[] =>
  [...events].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

const createSeedEvent = (householdId: string): LifeEvent => {
  const createdAt = new Date().toISOString();
  const targetDate = daysFromNow(90);
  const inputs: Record<string, string | number | null> = {
    budget: 4_200_000_00,
    city: "Stockholm",
    targetDate,
  };
  const playbookActions = buildPlaybook("buying_apartment", targetDate).map((action, index) => {
    if (index < 2) {
      return {
        ...action,
        completedAt: new Date().toISOString(),
        status: "completed" as const,
      };
    }

    return action;
  });
  const progress = computePlaybookProgress(playbookActions);
  const impact = buildImpactSummary("buying_apartment", inputs);

  return {
    createdAt,
    eventType: "buying_apartment",
    householdId,
    id: createId(),
    impactData: impact.impactData,
    impactSummary: impact.impactSummary,
    inputs,
    playbook: {
      actions: playbookActions,
      totalActions: playbookActions.length,
    },
    progress,
    status: "active",
    targetDate,
    title: "Buying our first apartment",
    updatedAt: createdAt,
  };
};

const createSeedTimelineEntries = (
  householdId: string,
  actor: TimelineActor,
  seedEvent: LifeEvent,
): TimelineEntry[] => {
  const linkedEvent = {
    id: seedEvent.id,
    status: seedEvent.status,
    title: seedEvent.title,
  };

  return sortTimelineEntries([
    toTimelineEntry({
      actor,
      category: "investing",
      description:
        "Started monthly auto-invest from salary account with 65/35 equity/fixed-income split.",
      entryDate: daysFromNow(-240),
      entryType: "decision",
      householdId,
      linkedEvent: null,
      title: "Set long-term monthly investment cadence",
    }),
    toTimelineEntry({
      actor,
      category: "planning",
      description:
        "Completed first structured quarterly review and set the next 90-day priorities.",
      entryDate: daysFromNow(-95),
      entryType: "review",
      householdId,
      linkedEvent: null,
      title: "Q4 household review completed",
    }),
    toTimelineEntry({
      actor,
      category: "housing",
      description:
        "Started apartment planning playbook with target move-in date and budget constraints.",
      entryDate: daysFromNow(-55),
      entryType: "life_event",
      householdId,
      linkedEvent,
      title: seedEvent.title,
    }),
    toTimelineEntry({
      actor,
      category: "other",
      description: "Financial fitness crossed 700 after liabilities and buffer improvements.",
      entryDate: daysFromNow(-18),
      entryType: "milestone",
      householdId,
      linkedEvent: null,
      title: "Fitness score milestone reached",
    }),
    toTimelineEntry({
      actor,
      category: "planning",
      description:
        "Sprint 4 timeline, event playbook, and fitness workflows activated in this demo workspace.",
      entryDate: daysFromNow(-1),
      entryType: "system",
      householdId,
      linkedEvent: null,
      title: "Sprint 4 experience enabled",
    }),
  ]);
};

const createSeedHouseholdState = (householdId: string, actor: TimelineActor): HouseholdState => {
  const seedEvent = createSeedEvent(householdId);

  return {
    events: [seedEvent],
    fitnessHistory: [],
    timelineEntries: createSeedTimelineEntries(householdId, actor, seedEvent),
  };
};

const readState = (): Sprint4State => {
  if (typeof window === "undefined") {
    return clone(DEFAULT_STATE);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return clone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Sprint4State>;
    return {
      households: parsed.households ?? {},
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
};

const writeState = (state: Sprint4State): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const ensureHouseholdState = (
  state: Sprint4State,
  householdId: string,
  actor: TimelineActor,
): HouseholdState => {
  const existing = state.households[householdId];

  if (existing) {
    return existing;
  }

  const seeded = createSeedHouseholdState(householdId, actor);
  state.households[householdId] = seeded;
  return seeded;
};

const resolveActor = (actor: TimelineActor | null | undefined): TimelineActor => {
  if (!actor) {
    return DEFAULT_ACTOR;
  }

  const id = actor.id.trim();
  const displayName = actor.displayName.trim();

  if (!id || !displayName) {
    return DEFAULT_ACTOR;
  }

  return {
    displayName,
    id,
  };
};

const seedFitnessHistory = (
  totalScore: number,
  existing: FitnessHistoryPoint[],
): FitnessHistoryPoint[] => {
  if (existing.length > 0) {
    return existing;
  }

  const points: FitnessHistoryPoint[] = [];

  for (let offset = 5; offset >= 1; offset -= 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - offset);
    const drift = (6 - offset) * 8;
    const oscillation = offset % 2 === 0 ? 6 : -4;

    points.push({
      date: toDateOnly(date),
      score: clamp(Math.round(totalScore - drift + oscillation), 360, 960),
    });
  }

  return points;
};

const normalizeTimelineEntry = (entry: TimelineEntry): TimelineEntry => {
  const today = toDateOnly(new Date());

  return {
    ...entry,
    isFuture: entry.entryDate > today,
  };
};

const filterTimelineEntries = (
  entries: TimelineEntry[],
  filters: TimelineFilters,
): TimelineEntry[] => {
  const search = filters.search?.trim().toLowerCase() ?? "";

  return entries.filter((entry) => {
    if (filters.types && filters.types.length > 0 && !filters.types.includes(entry.entryType)) {
      return false;
    }

    if (
      filters.categories &&
      filters.categories.length > 0 &&
      !filters.categories.includes(entry.category)
    ) {
      return false;
    }

    if (filters.from && entry.entryDate < filters.from) {
      return false;
    }

    if (filters.to && entry.entryDate > filters.to) {
      return false;
    }

    if (!search) {
      return true;
    }

    const searchableText = [
      entry.title,
      entry.description ?? "",
      entry.linkedEvent?.title ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search);
  });
};

const getActionById = (
  event: LifeEvent,
  actionId: string,
): { action: PlaybookAction; index: number } | null => {
  const index = event.playbook.actions.findIndex((action) => action.id === actionId);

  if (index < 0) {
    return null;
  }

  const action = event.playbook.actions[index];
  if (!action) {
    return null;
  }

  return {
    action,
    index,
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const componentOrder: FitnessComponent[] = [
  "buffer",
  "growth",
  "protection",
  "efficiency",
  "trajectory",
];

const suggestionByComponent = (
  component: FitnessComponent,
  score: number,
): FitnessPayload["current"]["suggestedActions"][number] => {
  const impactPoints = clamp(Math.round((200 - score) / 5), 8, 35);

  if (component === "buffer") {
    return {
      component,
      description:
        "Automate monthly transfers into a 4-6 month reserve before adding new long-term obligations.",
      impact: `+${impactPoints} points`,
      title: "Increase emergency buffer coverage",
    };
  }

  if (component === "growth") {
    return {
      component,
      description:
        "Raise recurring investment allocation by 3-5 percentage points while preserving your minimum cash runway.",
      impact: `+${impactPoints} points`,
      title: "Strengthen long-term growth contribution",
    };
  }

  if (component === "protection") {
    return {
      component,
      description:
        "Close outstanding insurance and legal checklist items tied to high-impact life events.",
      impact: `+${impactPoints} points`,
      title: "Reduce protection gap",
    };
  }

  if (component === "efficiency") {
    return {
      component,
      description:
        "Refresh stale accounts and tighten recurring cost categories with low household value.",
      impact: `+${impactPoints} points`,
      title: "Improve data and cash-flow efficiency",
    };
  }

  return {
    component,
    description:
      "Complete one high-priority playbook action this week and review trend direction in 30 days.",
    impact: `+${impactPoints} points`,
    title: "Build positive score momentum",
  };
};

const scoreExplanation = (
  totalScore: number,
  scores: Record<FitnessComponent, number>,
): string => {
  const weakest = componentOrder
    .map((component) => ({
      component,
      score: scores[component],
    }))
    .sort((left, right) => left.score - right.score)[0];

  const strongest = componentOrder
    .map((component) => ({
      component,
      score: scores[component],
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!weakest || !strongest) {
    return "Fitness breakdown is still stabilizing. Add more data to improve score confidence.";
  }

  return `Household fitness is ${totalScore}/1000. Strongest component: ${strongest.component} (${strongest.score}/200). Largest improvement opportunity: ${weakest.component} (${weakest.score}/200).`;
};

export const listEventLibraryFallback = async (): Promise<EventLibraryItem[]> => {
  await wait(API_DELAY_MS);
  return clone(EVENT_LIBRARY);
};

export const listTimelineEntriesFallback = async ({
  actor,
  filters,
  householdId,
}: {
  actor?: TimelineActor | null;
  filters: TimelineFilters;
  householdId: string;
}): Promise<TimelineEntry[]> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  const filtered = filterTimelineEntries(householdState.timelineEntries, filters)
    .map(normalizeTimelineEntry);

  writeState(state);
  return sortTimelineEntries(filtered);
};

export const createTimelineEntryFallback = async ({
  actor,
  category,
  description,
  entryDate,
  entryType,
  householdId,
  title,
}: {
  actor: TimelineActor;
  category: TimelineCategory;
  description: string | null;
  entryDate: string;
  entryType: TimelineEntryType;
  householdId: string;
  title: string;
}): Promise<TimelineEntry> => {
  await wait(API_DELAY_MS);

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new ApiClientError("VALIDATION_ERROR", "Entry title is required.");
  }

  const parsedDate = parseDate(entryDate);
  if (!parsedDate) {
    throw new ApiClientError("VALIDATION_ERROR", "Entry date is invalid.");
  }

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  const entry = toTimelineEntry({
    actor: resolveActor(actor),
    category,
    description: description?.trim() ? description.trim() : null,
    entryDate: toDateOnly(parsedDate),
    entryType,
    householdId,
    linkedEvent: null,
    title: trimmedTitle,
  });

  householdState.timelineEntries = sortTimelineEntries([entry, ...householdState.timelineEntries]);
  writeState(state);

  return normalizeTimelineEntry(entry);
};

export const updateTimelineEntryFallback = async ({
  actor,
  householdId,
  id,
  payload,
}: {
  actor?: TimelineActor | null;
  householdId: string;
  id: string;
  payload: UpdateTimelineEntryRequest;
}): Promise<TimelineEntry> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  const index = householdState.timelineEntries.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new ApiClientError("NOT_FOUND", "Timeline entry not found.");
  }

  const current = householdState.timelineEntries[index];
  if (!current) {
    throw new ApiClientError("NOT_FOUND", "Timeline entry not found.");
  }

  const nextEntryDate = payload.entryDate ?? current.entryDate;
  if (!parseDate(nextEntryDate)) {
    throw new ApiClientError("VALIDATION_ERROR", "Entry date is invalid.");
  }

  const nextTitle = payload.title?.trim() ?? current.title;
  if (!nextTitle) {
    throw new ApiClientError("VALIDATION_ERROR", "Entry title is required.");
  }

  const updated: TimelineEntry = {
    ...current,
    category: payload.category ?? current.category,
    description:
      payload.description === undefined
        ? current.description
        : payload.description?.trim()
          ? payload.description.trim()
          : null,
    entryDate: nextEntryDate,
    entryType: payload.entryType ?? current.entryType,
    title: nextTitle,
  };

  householdState.timelineEntries[index] = normalizeTimelineEntry(updated);
  householdState.timelineEntries = sortTimelineEntries(householdState.timelineEntries);

  writeState(state);

  return normalizeTimelineEntry(updated);
};

export const deleteTimelineEntryFallback = async ({
  actor,
  householdId,
  id,
}: {
  actor?: TimelineActor | null;
  householdId: string;
  id: string;
}): Promise<void> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  householdState.timelineEntries = householdState.timelineEntries.filter((entry) => entry.id !== id);

  writeState(state);
};

export const listLifeEventsFallback = async ({
  actor,
  householdId,
}: {
  actor?: TimelineActor | null;
  householdId: string;
}): Promise<LifeEvent[]> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  writeState(state);

  return sortLifeEvents(clone(householdState.events));
};

export const getLifeEventFallback = async ({
  actor,
  householdId,
  id,
}: {
  actor?: TimelineActor | null;
  householdId: string;
  id: string;
}): Promise<LifeEvent> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  const event = householdState.events.find((candidate) => candidate.id === id);
  if (!event) {
    throw new ApiClientError("NOT_FOUND", "Life event not found.");
  }

  writeState(state);

  return clone(event);
};

export const triggerLifeEventFallback = async ({
  actor,
  payload,
}: {
  actor: TimelineActor;
  payload: TriggerLifeEventRequest;
}): Promise<LifeEvent> => {
  await wait(API_DELAY_MS + 140);

  const title = payload.title.trim();
  if (!title) {
    throw new ApiClientError("VALIDATION_ERROR", "Event title is required.");
  }

  const selectedLibraryItem = EVENT_LIBRARY.find((item) => item.eventType === payload.eventType);
  if (!selectedLibraryItem) {
    throw new ApiClientError("VALIDATION_ERROR", "Unsupported event type.");
  }

  const targetDateRaw = payload.inputs.targetDate;
  const targetDate =
    typeof targetDateRaw === "string" && parseDate(targetDateRaw)
      ? targetDateRaw
      : daysFromNow(90);

  const now = new Date().toISOString();
  const playbookActions = buildPlaybook(payload.eventType, targetDate);
  const progress = computePlaybookProgress(playbookActions);
  const impact = buildImpactSummary(payload.eventType, payload.inputs);

  const event: LifeEvent = {
    createdAt: now,
    eventType: payload.eventType,
    householdId: payload.householdId,
    id: createId(),
    impactData: impact.impactData,
    impactSummary: impact.impactSummary,
    inputs: payload.inputs,
    playbook: {
      actions: playbookActions,
      totalActions: playbookActions.length,
    },
    progress,
    status: "active",
    targetDate,
    title,
    updatedAt: now,
  };

  const state = readState();
  const householdState = ensureHouseholdState(state, payload.householdId, resolveActor(actor));

  householdState.events = sortLifeEvents([event, ...householdState.events]);

  const timelineEntry = toTimelineEntry({
    actor: resolveActor(actor),
    category: selectedLibraryItem.category,
    description: "Playbook generated and ready for checklist execution.",
    entryDate: toDateOnly(new Date()),
    entryType: "life_event",
    householdId: payload.householdId,
    linkedEvent: {
      id: event.id,
      status: event.status,
      title: event.title,
    },
    title,
  });

  householdState.timelineEntries = sortTimelineEntries([
    timelineEntry,
    ...householdState.timelineEntries,
  ]);

  writeState(state);

  return clone(event);
};

export const updatePlaybookActionFallback = async ({
  actor,
  eventId,
  householdId,
  payload,
  actionId,
}: {
  actionId: string;
  actor?: TimelineActor | null;
  eventId: string;
  householdId: string;
  payload: UpdatePlaybookActionRequest;
}): Promise<LifeEvent> => {
  await wait(API_DELAY_MS);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  const eventIndex = householdState.events.findIndex((event) => event.id === eventId);
  if (eventIndex < 0) {
    throw new ApiClientError("NOT_FOUND", "Life event not found.");
  }

  const event = householdState.events[eventIndex];
  if (!event) {
    throw new ApiClientError("NOT_FOUND", "Life event not found.");
  }

  const actionRef = getActionById(event, actionId);
  if (!actionRef) {
    throw new ApiClientError("NOT_FOUND", "Playbook action not found.");
  }

  const nowIso = new Date().toISOString();
  const previousStatus = actionRef.action.status;

  const nextStatus: PlaybookActionStatus = payload.status ?? actionRef.action.status;

  const updatedAction: PlaybookAction = {
    ...actionRef.action,
    assignedTo:
      payload.assignedTo === undefined ? actionRef.action.assignedTo : payload.assignedTo,
    assignedToLabel:
      payload.assignedToLabel === undefined
        ? actionRef.action.assignedToLabel
        : payload.assignedToLabel,
    completedAt:
      nextStatus === "completed"
        ? actionRef.action.completedAt ?? nowIso
        : null,
    status: nextStatus,
  };

  const updatedActions = [...event.playbook.actions];
  updatedActions[actionRef.index] = updatedAction;

  const progress = computePlaybookProgress(updatedActions);
  const nextStatusValue =
    progress.completed + progress.skipped >= progress.total && progress.total > 0
      ? "completed"
      : event.status;

  const updatedEvent: LifeEvent = {
    ...event,
    playbook: {
      actions: updatedActions,
      totalActions: updatedActions.length,
    },
    progress,
    status: nextStatusValue,
    updatedAt: nowIso,
  };

  householdState.events[eventIndex] = updatedEvent;

  if (previousStatus !== "completed" && updatedAction.status === "completed") {
    householdState.timelineEntries = sortTimelineEntries([
      toTimelineEntry({
        actor: resolveActor(actor),
        category: "planning",
        description: updatedAction.estimatedImpactDescription,
        entryDate: toDateOnly(new Date()),
        entryType: "note",
        householdId,
        linkedEvent: {
          id: updatedEvent.id,
          status: updatedEvent.status,
          title: updatedEvent.title,
        },
        title: `Completed playbook action: ${updatedAction.title}`,
      }),
      ...householdState.timelineEntries,
    ]);
  }

  if (event.status !== "completed" && updatedEvent.status === "completed") {
    householdState.timelineEntries = sortTimelineEntries([
      toTimelineEntry({
        actor: resolveActor(actor),
        category: "planning",
        description: `All ${updatedEvent.progress.total} playbook actions resolved for ${getEventLabel(updatedEvent.eventType)}.`,
        entryDate: toDateOnly(new Date()),
        entryType: "milestone",
        householdId,
        linkedEvent: {
          id: updatedEvent.id,
          status: updatedEvent.status,
          title: updatedEvent.title,
        },
        title: `${updatedEvent.title} playbook completed`,
      }),
      ...householdState.timelineEntries,
    ]);
  }

  writeState(state);

  return clone(updatedEvent);
};

export const loadFitnessFallback = async ({
  actor,
  householdId,
}: {
  actor?: TimelineActor | null;
  householdId: string;
}): Promise<FitnessPayload> => {
  await wait(API_DELAY_MS);

  const [snapshot, weeklyDelta] = await Promise.all([
    loadBalanceSheetSnapshot(householdId),
    loadWeeklyNetWorthDelta(householdId),
  ]);

  const state = readState();
  const householdState = ensureHouseholdState(state, householdId, resolveActor(actor));

  const liquidAssets = snapshot.byAccountType
    .filter((entry) => LIQUID_ACCOUNT_TYPES.has(entry.key) && entry.value > 0)
    .reduce((sum, entry) => sum + entry.value, 0);

  const growthAssets = snapshot.byAccountType
    .filter((entry) => GROWTH_ACCOUNT_TYPES.has(entry.key) && entry.value > 0)
    .reduce((sum, entry) => sum + entry.value, 0);

  const assetBase = Math.max(snapshot.totalAssets, 1);
  const liabilityRatio = snapshot.totalLiabilities / Math.max(snapshot.totalAssets, 1);

  const totalPlaybookActions = householdState.events.reduce(
    (sum, event) => sum + event.playbook.actions.length,
    0,
  );
  const completedPlaybookActions = householdState.events.reduce(
    (sum, event) =>
      sum +
      event.playbook.actions.filter((action) => action.status === "completed").length,
    0,
  );

  const protectionActions = householdState.events.flatMap((event) =>
    event.playbook.actions.filter(
      (action) =>
        action.category === "insurance" ||
        action.category === "legal" ||
        action.priority === "critical",
    ),
  );

  const completedProtectionActions = protectionActions.filter(
    (action) => action.status === "completed",
  ).length;

  const bufferScore = clamp(
    Math.round(72 + (liquidAssets / assetBase) * 165 - liabilityRatio * 40),
    0,
    200,
  );

  const deltaBonus =
    weeklyDelta.pct === null
      ? 0
      : clamp(Math.round(weeklyDelta.pct * 1.8), -24, 30);

  const growthScore = clamp(
    Math.round(64 + (growthAssets / assetBase) * 136 + deltaBonus),
    0,
    200,
  );

  const protectionBase =
    protectionActions.length === 0
      ? 74
      : 62 + (completedProtectionActions / protectionActions.length) * 118;

  const protectionScore = clamp(
    Math.round(protectionBase - Math.max(0, liabilityRatio - 0.6) * 32),
    0,
    200,
  );

  const efficiencyScore = clamp(
    Math.round(
      72 +
        snapshot.freshness.coveragePct * 0.9 -
        snapshot.freshness.staleAccounts * 13,
    ),
    0,
    200,
  );

  const completionRatio =
    totalPlaybookActions === 0 ? 0 : completedPlaybookActions / totalPlaybookActions;

  const historicalMomentum = (() => {
    const history = householdState.fitnessHistory;
    if (history.length < 2) {
      return 0;
    }

    const first = history[0];
    const last = history[history.length - 1];

    if (!first || !last) {
      return 0;
    }

    return clamp(Math.round((last.score - first.score) / 6), -18, 22);
  })();

  const trajectoryScore = clamp(
    Math.round(70 + completionRatio * 78 + deltaBonus * 1.4 + historicalMomentum),
    0,
    200,
  );

  const componentScores: Record<FitnessComponent, number> = {
    buffer: bufferScore,
    efficiency: efficiencyScore,
    growth: growthScore,
    protection: protectionScore,
    trajectory: trajectoryScore,
  };

  const totalScore = clamp(
    bufferScore + growthScore + protectionScore + efficiencyScore + trajectoryScore,
    0,
    1000,
  );

  const today = toDateOnly(new Date());

  householdState.fitnessHistory = seedFitnessHistory(totalScore, householdState.fitnessHistory)
    .filter((point, index, list) => list.findIndex((candidate) => candidate.date === point.date) === index)
    .sort((left, right) => left.date.localeCompare(right.date));

  const todayIndex = householdState.fitnessHistory.findIndex((point) => point.date === today);

  if (todayIndex >= 0) {
    householdState.fitnessHistory[todayIndex] = {
      date: today,
      score: totalScore,
    };
  } else {
    householdState.fitnessHistory.push({
      date: today,
      score: totalScore,
    });
  }

  householdState.fitnessHistory = householdState.fitnessHistory
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-8);

  const weakestComponents = componentOrder
    .map((component) => ({
      component,
      score: componentScores[component],
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, 3);

  writeState(state);

  return {
    current: {
      bufferScore,
      calculatedAt: today,
      efficiencyScore,
      explanation: scoreExplanation(totalScore, componentScores),
      growthScore,
      protectionScore,
      suggestedActions: weakestComponents.map((entry) =>
        suggestionByComponent(entry.component, entry.score),
      ),
      totalScore,
      trajectoryScore,
    },
    history: [...householdState.fitnessHistory],
  };
};
