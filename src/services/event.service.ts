import type { SupabaseClient } from "@supabase/supabase-js";

import { generateLifeEventPlaybook } from "@/lib/ai/playbook";
import type { PlaybookAiAction } from "@/lib/ai/schemas";
import type { AuthContext } from "@/lib/auth/middleware";
import { balanceSheetService } from "@/services/balance-sheet.service";
import { ServiceError } from "@/services/errors";
import type {
  CreateLifeEventInput,
  UpdatePlaybookActionInput,
} from "@/lib/validations/events";
import type { HouseholdMemberStatus, HouseholdRole } from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface LifeEventRow {
  id: string;
  household_id: string;
  triggered_by: string;
  event_type: string;
  title: string;
  status: string;
  inputs: Record<string, unknown>;
  impact_summary: string | null;
  impact_data: Record<string, unknown> | null;
  target_date: string | null;
  completed_at: string | null;
  timeline_entry_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface PlaybookActionRow {
  id: string;
  life_event_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  sort_order: number;
  assigned_to: string | null;
  status: string;
  estimated_impact_amount: number | null;
  estimated_impact_description: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EventLibraryInputField {
  key: string;
  label: string;
  type: "currency" | "date" | "select" | "number" | "text";
  options?: string[];
}

interface EventLibraryItem {
  eventType: string;
  title: string;
  description: string;
  category: "housing" | "family" | "career" | "investment" | "retirement" | "other";
  requiredInputs: EventLibraryInputField[];
  available: boolean;
}

type PlaybookActionTemplate = PlaybookAiAction;

interface EventPlaybookActionView {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  sortOrder: number;
  assignedTo: string | null;
  status: string;
  estimatedImpactDescription: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  updatedAt: string;
}

interface EventCreateResponse {
  id: string;
  eventType: string;
  title: string;
  status: string;
  playbook: {
    actions: EventPlaybookActionView[];
    totalActions: number;
    source: "ai" | "fallback";
  };
  impactSummary: string | null;
  impactData: Record<string, unknown> | null;
}

const eventLibrary: EventLibraryItem[] = [
  {
    eventType: "buying_apartment",
    title: "Buying an apartment",
    description: "Plan your first home purchase with a complete financial playbook.",
    category: "housing",
    requiredInputs: [
      { key: "budget", label: "Budget (SEK)", type: "currency" },
      {
        key: "city",
        label: "City",
        type: "select",
        options: ["Stockholm", "Gothenburg", "Malmö", "Other"],
      },
      { key: "targetDate", label: "Target date", type: "date" },
    ],
    available: true,
  },
  {
    eventType: "having_child",
    title: "Having a child",
    description: "Prepare household cash flow, protection, and practical planning for a new child.",
    category: "family",
    requiredInputs: [
      { key: "dueDate", label: "Due date", type: "date" },
      { key: "parentalLeaveMonths", label: "Parental leave months", type: "number" },
    ],
    available: true,
  },
  {
    eventType: "changing_jobs",
    title: "Changing jobs",
    description: "Assess salary, pension, and tax impact before transitioning roles.",
    category: "career",
    requiredInputs: [
      { key: "salaryDelta", label: "Monthly salary delta (SEK)", type: "currency" },
      { key: "startDate", label: "Start date", type: "date" },
    ],
    available: true,
  },
  {
    eventType: "inheritance",
    title: "Receiving inheritance",
    description: "Structure inherited assets with tax, legal, and allocation priorities.",
    category: "investment",
    requiredInputs: [
      { key: "inheritanceAmount", label: "Inheritance amount (SEK)", type: "currency" },
      { key: "receivedDate", label: "Expected date", type: "date" },
    ],
    available: true,
  },
  {
    eventType: "retirement",
    title: "Preparing retirement",
    description: "Align retirement timeline, drawdown approach, and coverage planning.",
    category: "retirement",
    requiredInputs: [
      { key: "retirementDate", label: "Target retirement date", type: "date" },
      { key: "targetMonthlySpend", label: "Target monthly spend (SEK)", type: "currency" },
    ],
    available: true,
  },
  {
    eventType: "marriage",
    title: "Getting married",
    description: "Coordinate shared planning, legal updates, and account structure as a household.",
    category: "family",
    requiredInputs: [
      { key: "weddingDate", label: "Wedding date", type: "date" },
      { key: "weddingBudget", label: "Wedding budget (SEK)", type: "currency" },
    ],
    available: true,
  },
  {
    eventType: "divorce",
    title: "Divorce planning",
    description: "Plan legal, budget, and asset split actions with clear step-by-step priorities.",
    category: "family",
    requiredInputs: [
      { key: "targetDate", label: "Target separation date", type: "date" },
      { key: "householdSplitRatio", label: "Expected split ratio", type: "text" },
    ],
    available: true,
  },
];

function toIsoDate(input?: string | Date): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }

  if (input instanceof Date) {
    return input.toISOString().slice(0, 10);
  }

  const parsed = Date.parse(input);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString().slice(0, 10);
  }

  return new Date(parsed).toISOString().slice(0, 10);
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** Math.max(decimals, 0);
  return Math.round(value * factor) / factor;
}

function formatSek(valueMinor: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

export class EventService {
  async getLibrary(): Promise<EventLibraryItem[]> {
    return eventLibrary;
  }

  async create(authContext: AuthContext, input: CreateLifeEventInput): Promise<EventCreateResponse> {
    const { supabase, user } = authContext;
    await this.requireHouseholdMembership(supabase, input.householdId, user.id);

    const libraryItem = eventLibrary.find((item) => item.eventType === input.eventType);
    if (!libraryItem) {
      throw ServiceError.validation("Unsupported life event type");
    }

    const targetDate = this.extractTargetDate(input.inputs);
    const impact = await this.buildImpactProjection(authContext, input.householdId, input.eventType, input.inputs);

    const { data: eventData, error: eventError } = await supabase
      .from("life_events")
      .insert({
        household_id: input.householdId,
        triggered_by: user.id,
        event_type: input.eventType,
        title: input.title,
        status: "active",
        inputs: input.inputs,
        impact_summary: impact.summary,
        impact_data: impact.data,
        target_date: targetDate,
      })
      .select(
        "id, household_id, triggered_by, event_type, title, status, inputs, impact_summary, impact_data, target_date, completed_at, timeline_entry_id, created_at, updated_at, deleted_at",
      )
      .single();

    if (eventError) {
      throw eventError;
    }

    const event = eventData as LifeEventRow;
    const entryDate = targetDate ?? toIsoDate();
    const isFuture = entryDate > toIsoDate();

    const { data: timelineEntry, error: timelineError } = await supabase
      .from("timeline_entries")
      .insert({
        household_id: input.householdId,
        created_by: user.id,
        entry_type: "life_event",
        category: libraryItem.category,
        title: input.title,
        description: `Triggered life event: ${libraryItem.title}`,
        linked_event_id: event.id,
        entry_date: entryDate,
        is_future: isFuture,
        metadata: {
          source: "events_api",
          eventType: input.eventType,
        },
      })
      .select("id")
      .single();

    if (timelineError) {
      throw timelineError;
    }

    const timelineEntryId = (timelineEntry as { id: string }).id;
    const { error: eventLinkError } = await supabase
      .from("life_events")
      .update({
        timeline_entry_id: timelineEntryId,
      })
      .eq("id", event.id);

    if (eventLinkError) {
      throw eventLinkError;
    }

    const actionTemplates = this.buildPlaybookTemplates(input.eventType);
    const generatedPlaybook = await generateLifeEventPlaybook(
      {
        eventType: input.eventType,
        title: input.title,
        targetDate,
        inputs: input.inputs,
        impactSummary: impact.summary,
        impactData: impact.data,
      },
      {
        fallbackActions: actionTemplates,
      },
    );

    const { data: actionData, error: actionError } = await supabase
      .from("playbook_actions")
      .insert(
        generatedPlaybook.actions.map((template, index) => ({
          life_event_id: event.id,
          title: template.title,
          description: template.description,
          category: template.category,
          priority: template.priority,
          sort_order: index,
          status: "pending",
          estimated_impact_description: template.estimatedImpactDescription,
        })),
      )
      .select(
        "id, life_event_id, title, description, category, priority, sort_order, assigned_to, status, estimated_impact_amount, estimated_impact_description, completed_at, completion_notes, created_at, updated_at",
      )
      .order("sort_order", { ascending: true });

    if (actionError) {
      throw actionError;
    }

    const actions = (actionData ?? []) as PlaybookActionRow[];

    return {
      id: event.id,
      eventType: event.event_type,
      title: event.title,
      status: event.status,
      playbook: {
        actions: actions.map((action) => this.mapAction(action)),
        totalActions: actions.length,
        source: generatedPlaybook.source,
      },
      impactSummary: event.impact_summary,
      impactData: event.impact_data,
    };
  }

  async updateAction(
    authContext: AuthContext,
    eventId: string,
    actionId: string,
    input: UpdatePlaybookActionInput,
  ): Promise<EventPlaybookActionView> {
    const { supabase, user } = authContext;
    const event = await this.getLifeEventById(supabase, eventId);

    if (!event || event.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Life event was not found");
    }

    await this.requireHouseholdMembership(supabase, event.household_id, user.id);

    const action = await this.getPlaybookActionById(supabase, eventId, actionId);
    if (!action) {
      throw new ServiceError("NOT_FOUND", "Playbook action was not found");
    }

    if (input.assignedTo !== undefined && input.assignedTo !== null) {
      await this.requireHouseholdMemberByUserId(supabase, event.household_id, input.assignedTo);
    }

    const updatePayload: Record<string, unknown> = {};
    const nowIso = new Date().toISOString();

    if (input.status !== undefined) {
      updatePayload.status = input.status;
      updatePayload.completed_at = input.status === "completed" ? nowIso : null;
    }

    if (input.assignedTo !== undefined) {
      updatePayload.assigned_to = input.assignedTo;
    }

    if (input.completionNotes !== undefined) {
      updatePayload.completion_notes = input.completionNotes;
      if (input.status === undefined && input.completionNotes !== null) {
        updatePayload.completed_at = action.completed_at ?? nowIso;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.mapAction(action);
    }

    const { data, error } = await supabase
      .from("playbook_actions")
      .update(updatePayload)
      .eq("id", action.id)
      .eq("life_event_id", event.id)
      .select(
        "id, life_event_id, title, description, category, priority, sort_order, assigned_to, status, estimated_impact_amount, estimated_impact_description, completed_at, completion_notes, created_at, updated_at",
      )
      .single();

    if (error) {
      throw error;
    }

    await this.syncLifeEventStatus(supabase, event.id, event.status);
    return this.mapAction(data as PlaybookActionRow);
  }

  private async syncLifeEventStatus(
    supabase: SupabaseClient,
    lifeEventId: string,
    currentStatus: string,
  ): Promise<void> {
    if (currentStatus === "cancelled") {
      return;
    }

    const { data: actionRows, error: actionError } = await supabase
      .from("playbook_actions")
      .select("status")
      .eq("life_event_id", lifeEventId);

    if (actionError) {
      throw actionError;
    }

    const statuses = (actionRows ?? []) as Array<{ status: string }>;
    if (statuses.length === 0) {
      return;
    }

    const allDone = statuses.every(
      (row) => row.status === "completed" || row.status === "skipped",
    );
    const nextStatus = allDone ? "completed" : "active";
    const completedAt = allDone ? new Date().toISOString() : null;

    if (nextStatus === currentStatus && (!allDone || completedAt === null)) {
      return;
    }

    const { error } = await supabase
      .from("life_events")
      .update({
        status: nextStatus,
        completed_at: completedAt,
      })
      .eq("id", lifeEventId);

    if (error) {
      throw error;
    }
  }

  private async getLifeEventById(
    supabase: SupabaseClient,
    lifeEventId: string,
  ): Promise<LifeEventRow | null> {
    const { data, error } = await supabase
      .from("life_events")
      .select(
        "id, household_id, triggered_by, event_type, title, status, inputs, impact_summary, impact_data, target_date, completed_at, timeline_entry_id, created_at, updated_at, deleted_at",
      )
      .eq("id", lifeEventId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as LifeEventRow | null) ?? null;
  }

  private async getPlaybookActionById(
    supabase: SupabaseClient,
    lifeEventId: string,
    actionId: string,
  ): Promise<PlaybookActionRow | null> {
    const { data, error } = await supabase
      .from("playbook_actions")
      .select(
        "id, life_event_id, title, description, category, priority, sort_order, assigned_to, status, estimated_impact_amount, estimated_impact_description, completed_at, completion_notes, created_at, updated_at",
      )
      .eq("life_event_id", lifeEventId)
      .eq("id", actionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as PlaybookActionRow | null) ?? null;
  }

  private async requireHouseholdMembership(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
  ): Promise<HouseholdMemberRow> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || data.status !== "active") {
      throw new ServiceError("FORBIDDEN", "You are not a member of this household");
    }

    return data as HouseholdMemberRow;
  }

  private async requireHouseholdMemberByUserId(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
  ): Promise<void> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw ServiceError.validation("assignedTo must be an active household member");
    }
  }

  private mapAction(action: PlaybookActionRow): EventPlaybookActionView {
    return {
      id: action.id,
      title: action.title,
      description: action.description,
      category: action.category,
      priority: action.priority,
      sortOrder: action.sort_order,
      assignedTo: action.assigned_to,
      status: action.status,
      estimatedImpactDescription: action.estimated_impact_description,
      completedAt: action.completed_at,
      completionNotes: action.completion_notes,
      updatedAt: action.updated_at,
    };
  }

  private extractTargetDate(inputs: Record<string, unknown>): string | null {
    const candidateKeys = ["targetDate", "dueDate", "startDate", "receivedDate", "retirementDate", "weddingDate"];
    for (const key of candidateKeys) {
      const value = inputs[key];
      if (typeof value !== "string") {
        continue;
      }

      if (/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
        return value;
      }
    }

    return null;
  }

  private toInteger(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private async buildImpactProjection(
    authContext: AuthContext,
    householdId: string,
    eventType: string,
    inputs: Record<string, unknown>,
  ): Promise<{ summary: string; data: Record<string, unknown> | null }> {
    let currentNetWorth: number | null = null;

    try {
      const balanceSheet = await balanceSheetService.getBalanceSheet(authContext, householdId);
      currentNetWorth = balanceSheet.totalNetWorth;
    } catch {
      currentNetWorth = null;
    }

    if (eventType === "buying_apartment") {
      const budget = this.toInteger(inputs.budget) ?? 0;
      const downPaymentRequired = budget > 0 ? Math.round(budget * 0.15) : null;
      const mortgagePrincipal =
        budget > 0 && downPaymentRequired !== null ? Math.max(0, budget - downPaymentRequired) : null;
      const monthlyMortgageCost =
        mortgagePrincipal !== null
          ? Math.round((mortgagePrincipal * 0.04) / 12 + (mortgagePrincipal * 0.02) / 12)
          : null;
      const netWorthImpactPct =
        downPaymentRequired !== null && currentNetWorth && currentNetWorth > 0
          ? -roundTo((downPaymentRequired / currentNetWorth) * 100, 1)
          : -12;
      const fitnessScoreImpact = -Math.min(120, Math.max(12, Math.round(Math.abs(netWorthImpactPct) * 2.5)));

      return {
        summary:
          budget > 0
            ? `Based on a ${formatSek(budget)} apartment purchase, the immediate liquidity impact is concentrated in the required down payment.`
            : "Apartment purchase impact estimated from standard Swedish mortgage assumptions.",
        data: {
          downPaymentRequired,
          monthlyMortgageCost,
          netWorthImpactPct,
          fitnessScoreImpact,
        },
      };
    }

    if (eventType === "having_child") {
      const annualCostIncrease = 72_000_00;
      return {
        summary: "Expected childcare and household spending increases are reflected in the planning baseline.",
        data: {
          annualCostIncrease,
          fitnessScoreImpact: -18,
        },
      };
    }

    if (eventType === "changing_jobs") {
      const salaryDelta = this.toInteger(inputs.salaryDelta) ?? 0;
      return {
        summary: "Job change impact estimated from salary delta and transition timing assumptions.",
        data: {
          monthlyIncomeDelta: salaryDelta,
          fitnessScoreImpact: salaryDelta >= 0 ? 12 : -12,
        },
      };
    }

    if (eventType === "inheritance") {
      const inheritanceAmount = this.toInteger(inputs.inheritanceAmount) ?? null;
      return {
        summary: "Inheritance planning includes cash deployment, tax handling, and long-term allocation steps.",
        data: {
          inheritanceAmount,
          fitnessScoreImpact: 20,
        },
      };
    }

    if (eventType === "retirement") {
      return {
        summary: "Retirement readiness projection reflects drawdown pressure and income replacement requirements.",
        data: {
          fitnessScoreImpact: -10,
        },
      };
    }

    if (eventType === "marriage") {
      return {
        summary: "Marriage planning impact includes one-time costs and updated household governance actions.",
        data: {
          fitnessScoreImpact: -6,
        },
      };
    }

    return {
      summary: "Life event activated with a standard planning impact envelope.",
      data: {
        fitnessScoreImpact: -8,
      },
    };
  }

  private buildPlaybookTemplates(eventType: string): PlaybookActionTemplate[] {
    if (eventType === "buying_apartment") {
      return [
        {
          title: "Calculate maximum mortgage capacity",
          description: "Estimate safe borrowing capacity from income, debt ratio, and cash buffer.",
          category: "financial",
          priority: "critical",
          estimatedImpactDescription: "Defines your realistic purchase range.",
        },
        {
          title: "Lock a down-payment savings target",
          description: "Set and track monthly transfers to meet the minimum 15% down-payment.",
          category: "financial",
          priority: "critical",
          estimatedImpactDescription: "Improves purchase readiness and execution confidence.",
        },
        {
          title: "Review legal purchase costs",
          description: "Prepare budget for stamp duty, registration, and transaction costs.",
          category: "legal",
          priority: "high",
          estimatedImpactDescription: "Avoids liquidity surprises at closing.",
        },
        {
          title: "Evaluate home insurance coverage",
          description: "Adjust household insurance scope before move-in and financing finalization.",
          category: "insurance",
          priority: "high",
          estimatedImpactDescription: "Reduces downside risk around ownership transition.",
        },
        {
          title: "Plan tax wrapper adjustments",
          description: "Rebalance investment wrappers to preserve liquidity around the purchase date.",
          category: "tax",
          priority: "medium",
          estimatedImpactDescription: "Minimizes avoidable tax drag from forced sales.",
        },
        {
          title: "Prepare purchase administration checklist",
          description: "Track key dates, required documents, and lender interactions in one checklist.",
          category: "administrative",
          priority: "medium",
          estimatedImpactDescription: "Keeps purchase process on schedule.",
        },
      ];
    }

    return [
      {
        title: "Clarify financial objective and deadline",
        description: "Define event target state, timing, and measurable household constraints.",
        category: "financial",
        priority: "high",
        estimatedImpactDescription: "Creates a concrete planning baseline.",
      },
      {
        title: "Validate legal and documentation requirements",
        description: "Review legal prerequisites and required records before key milestones.",
        category: "legal",
        priority: "high",
        estimatedImpactDescription: "Reduces legal process risk.",
      },
      {
        title: "Review insurance and risk coverage",
        description: "Confirm insurance scope and beneficiary setup for event-related changes.",
        category: "insurance",
        priority: "medium",
        estimatedImpactDescription: "Improves resilience to unforeseen setbacks.",
      },
      {
        title: "Check tax implications and timing",
        description: "Assess tax consequences and optimal execution windows for planned actions.",
        category: "tax",
        priority: "medium",
        estimatedImpactDescription: "Improves net retained value.",
      },
      {
        title: "Create execution checklist",
        description: "Break down event milestones into clear owner-assigned operational tasks.",
        category: "administrative",
        priority: "medium",
        estimatedImpactDescription: "Improves completion reliability.",
      },
    ];
  }
}

export const eventService = new EventService();
