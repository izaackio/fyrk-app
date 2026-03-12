import type { SupabaseClient } from "@supabase/supabase-js";

import { generateLifeEventPlaybook } from "@/lib/ai/playbook";
import type { PlaybookAiAction } from "@/lib/ai/schemas";
import type { AuthContext } from "@/lib/auth/middleware";
import { assertHouseholdWritable } from "@/lib/demo";
import type {
  CreateLifeEventInput,
  UpdatePlaybookActionInput,
} from "@/lib/validations/events";
import { balanceSheetService } from "@/services/balance-sheet.service";
import { ServiceError } from "@/services/errors";
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

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

type EventInputValue = string | number | null;
type EventLibraryCategory = "housing" | "family" | "career" | "planning" | "other";
type EventStatus = "active" | "completed" | "cancelled";
type EventActionCategory = "financial" | "legal" | "insurance" | "tax" | "planning";
type EventActionPriority = "critical" | "high" | "medium" | "low";
type EventActionStatus = "pending" | "completed" | "skipped";

interface EventImpactView {
  downPaymentRequired: number | null;
  fitnessScoreImpact: number | null;
  monthlyMortgageCost: number | null;
  netWorthImpactPct: number | null;
}

interface EventProgressView {
  completed: number;
  pct: number;
  skipped: number;
  total: number;
}

interface EventLibraryInputField {
  hint: string | null;
  key: string;
  label: string;
  options: string[];
  required: boolean;
  type: "currency" | "date" | "select" | "number" | "text";
}

interface EventLibraryItem {
  available: boolean;
  category: EventLibraryCategory;
  description: string;
  eventType: string;
  requiredInputs: EventLibraryInputField[];
  title: string;
}

type PlaybookActionTemplate = PlaybookAiAction;

interface EventPlaybookActionView {
  assignedTo: string | null;
  assignedToLabel: string | null;
  category: EventActionCategory;
  completedAt: string | null;
  description: string;
  dueDate: string | null;
  estimatedImpactDescription: string;
  id: string;
  priority: EventActionPriority;
  status: EventActionStatus;
  title: string;
}

interface EventView {
  createdAt: string;
  eventType: string;
  householdId: string;
  id: string;
  impactData: EventImpactView;
  impactSummary: string;
  inputs: Record<string, EventInputValue>;
  playbook: {
    actions: EventPlaybookActionView[];
    totalActions: number;
  };
  progress: EventProgressView;
  status: EventStatus;
  targetDate: string | null;
  title: string;
  updatedAt: string;
}

interface EventServiceDependencies {
  generatePlaybook?: typeof generateLifeEventPlaybook;
  getBalanceSheet?: typeof balanceSheetService.getBalanceSheet;
}

const lifeEventSelectColumns =
  "id, household_id, triggered_by, event_type, title, status, inputs, impact_summary, impact_data, target_date, completed_at, timeline_entry_id, created_at, updated_at, deleted_at";

const playbookActionSelectColumns =
  "id, life_event_id, title, description, category, priority, sort_order, assigned_to, status, estimated_impact_amount, estimated_impact_description, completed_at, completion_notes, created_at, updated_at";

const eventLibrary: EventLibraryItem[] = [
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
        options: ["Stockholm", "Gothenburg", "Malmo", "Other"],
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
    description:
      "Forecast salary shift, pension changes, and near-term savings adjustments.",
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
    description:
      "Align legal, savings, and protection setup around household structure changes.",
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
    description:
      "Stabilize finances and legal ownership during household split transitions.",
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

export class EventService {
  constructor(private readonly dependencies: EventServiceDependencies = {}) {}

  async getLibrary(): Promise<EventLibraryItem[]> {
    return eventLibrary;
  }

  async list(authContext: AuthContext, householdId: string): Promise<EventView[]> {
    const { supabase, user } = authContext;
    await this.requireHouseholdMembership(supabase, householdId, user.id);

    const { data, error } = await supabase
      .from("life_events")
      .select(lifeEventSelectColumns)
      .eq("household_id", householdId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return this.buildEventViews(
      supabase,
      (data ?? []) as LifeEventRow[],
      authContext.profile,
    );
  }

  async get(
    authContext: AuthContext,
    eventId: string,
    householdId?: string,
  ): Promise<EventView> {
    const { supabase, user } = authContext;
    const event = await this.getLifeEventById(supabase, eventId);

    if (!event || event.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Life event was not found");
    }

    if (householdId && householdId !== event.household_id) {
      throw new ServiceError("NOT_FOUND", "Life event was not found");
    }

    await this.requireHouseholdMembership(supabase, event.household_id, user.id);

    const [view] = await this.buildEventViews(supabase, [event], authContext.profile);

    if (!view) {
      throw new ServiceError("NOT_FOUND", "Life event was not found");
    }

    return view;
  }

  async create(authContext: AuthContext, input: CreateLifeEventInput): Promise<EventView> {
    const { supabase, user } = authContext;
    await this.requireHouseholdMembership(supabase, input.householdId, user.id);
    await assertHouseholdWritable(supabase, input.householdId);

    const libraryItem = eventLibrary.find((item) => item.eventType === input.eventType);
    if (!libraryItem) {
      throw ServiceError.validation("Unsupported life event type");
    }

    const targetDate = this.extractTargetDate(input.inputs);
    const impact = await this.buildImpactProjection(
      authContext,
      input.householdId,
      input.eventType,
      input.inputs,
    );

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
      .select(lifeEventSelectColumns)
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
    const generatePlaybook =
      this.dependencies.generatePlaybook ?? generateLifeEventPlaybook;
    const generatedPlaybook = await generatePlaybook(
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

    const { error: actionError } = await supabase
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
      .select(playbookActionSelectColumns);

    if (actionError) {
      throw actionError;
    }

    return this.get(authContext, event.id, input.householdId);
  }

  async updateAction(
    authContext: AuthContext,
    eventId: string,
    actionId: string,
    input: UpdatePlaybookActionInput,
  ): Promise<EventView> {
    const { supabase, user } = authContext;
    const event = await this.getLifeEventById(supabase, eventId);

    if (!event || event.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Life event was not found");
    }

    if (input.householdId && input.householdId !== event.household_id) {
      throw new ServiceError("NOT_FOUND", "Life event was not found");
    }

    await this.requireHouseholdMembership(supabase, event.household_id, user.id);
    await assertHouseholdWritable(supabase, event.household_id);

    const action = await this.getPlaybookActionById(supabase, eventId, actionId);
    if (!action) {
      throw new ServiceError("NOT_FOUND", "Playbook action was not found");
    }

    const updatePayload: Record<string, unknown> = {};
    const nowIso = new Date().toISOString();

    if (input.status !== undefined) {
      updatePayload.status = input.status;
      updatePayload.completed_at = input.status === "completed" ? nowIso : null;
    }

    const assignedTo = await this.resolveAssignedToUserId(
      supabase,
      event.household_id,
      user.id,
      input.assignedTo,
    );
    if (assignedTo !== undefined) {
      updatePayload.assigned_to = assignedTo;
    }

    if (input.completionNotes !== undefined) {
      updatePayload.completion_notes = input.completionNotes;
      if (input.status === undefined && input.completionNotes !== null) {
        updatePayload.completed_at = action.completed_at ?? nowIso;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.get(authContext, event.id, event.household_id);
    }

    const { error } = await supabase
      .from("playbook_actions")
      .update(updatePayload)
      .eq("id", action.id)
      .eq("life_event_id", event.id)
      .select(playbookActionSelectColumns)
      .single();

    if (error) {
      throw error;
    }

    await this.syncLifeEventStatus(supabase, event.id, event.status);
    return this.get(authContext, event.id, event.household_id);
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

  private async buildEventViews(
    supabase: SupabaseClient,
    events: LifeEventRow[],
    viewerProfile: AuthContext["profile"],
  ): Promise<EventView[]> {
    if (events.length === 0) {
      return [];
    }

    const actionsByEventId = await this.getActionsByEventIds(
      supabase,
      events.map((event) => event.id),
    );
    const assignedUserIds = Array.from(
      new Set(
        Array.from(actionsByEventId.values())
          .flat()
          .map((action) => action.assigned_to)
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const profilesByUserId = await this.getProfilesByUserIds(supabase, assignedUserIds);

    profilesByUserId.set(viewerProfile.id, {
      display_name: viewerProfile.display_name,
      email: viewerProfile.email,
      id: viewerProfile.id,
    });

    return events.map((event) =>
      this.mapEvent(event, actionsByEventId.get(event.id) ?? [], profilesByUserId),
    );
  }

  private async getActionsByEventIds(
    supabase: SupabaseClient,
    eventIds: string[],
  ): Promise<Map<string, PlaybookActionRow[]>> {
    const output = new Map<string, PlaybookActionRow[]>();
    const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return output;
    }

    const { data, error } = await supabase
      .from("playbook_actions")
      .select(playbookActionSelectColumns)
      .in("life_event_id", uniqueIds)
      .order("sort_order", { ascending: true });

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as PlaybookActionRow[]) {
      const existing = output.get(row.life_event_id) ?? [];
      existing.push(row);
      output.set(row.life_event_id, existing);
    }

    return output;
  }

  private async getLifeEventById(
    supabase: SupabaseClient,
    lifeEventId: string,
  ): Promise<LifeEventRow | null> {
    const { data, error } = await supabase
      .from("life_events")
      .select(lifeEventSelectColumns)
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
      .select(playbookActionSelectColumns)
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

  private async getActiveHouseholdMembers(
    supabase: SupabaseClient,
    householdId: string,
  ): Promise<HouseholdMemberRow[]> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status")
      .eq("household_id", householdId)
      .eq("status", "active");

    if (error) {
      throw error;
    }

    return (data ?? []) as HouseholdMemberRow[];
  }

  private async getProfilesByUserIds(
    supabase: SupabaseClient,
    userIds: string[],
  ): Promise<Map<string, ProfileRow>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const output = new Map<string, ProfileRow>();

    if (uniqueIds.length === 0) {
      return output;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", uniqueIds);

    if (error) {
      return output;
    }

    for (const row of (data ?? []) as ProfileRow[]) {
      output.set(row.id, row);
    }

    return output;
  }

  private mapEvent(
    event: LifeEventRow,
    actions: PlaybookActionRow[],
    profilesByUserId: Map<string, ProfileRow>,
  ): EventView {
    const actionViews = actions.map((action) => this.mapAction(action, profilesByUserId));

    return {
      createdAt: event.created_at,
      eventType: event.event_type,
      householdId: event.household_id,
      id: event.id,
      impactData: this.normalizeImpactData(event.impact_data),
      impactSummary:
        event.impact_summary ?? "Life event activated with a standard planning impact envelope.",
      inputs: this.normalizeInputs(event.inputs),
      playbook: {
        actions: actionViews,
        totalActions: actionViews.length,
      },
      progress: this.computeProgress(actionViews),
      status: this.normalizeEventStatus(event.status),
      targetDate: event.target_date,
      title: event.title,
      updatedAt: event.updated_at,
    };
  }

  private mapAction(
    action: PlaybookActionRow,
    profilesByUserId: Map<string, ProfileRow>,
  ): EventPlaybookActionView {
    const assignee = action.assigned_to ? profilesByUserId.get(action.assigned_to) : null;

    return {
      assignedTo: action.assigned_to,
      assignedToLabel: assignee ? this.resolveProfileLabel(assignee) : null,
      category: this.normalizeActionCategory(action.category),
      completedAt: action.completed_at,
      description: action.description ?? "",
      dueDate: null,
      estimatedImpactDescription: action.estimated_impact_description ?? "",
      id: action.id,
      priority: this.normalizeActionPriority(action.priority),
      status: this.normalizeActionStatus(action.status),
      title: action.title,
    };
  }

  private computeProgress(actions: EventPlaybookActionView[]): EventProgressView {
    const completed = actions.filter((action) => action.status === "completed").length;
    const skipped = actions.filter((action) => action.status === "skipped").length;
    const total = actions.length;

    return {
      completed,
      pct: total === 0 ? 0 : Math.round(((completed + skipped) / total) * 100),
      skipped,
      total,
    };
  }

  private normalizeInputs(inputs: Record<string, unknown>): Record<string, EventInputValue> {
    const normalized: Record<string, EventInputValue> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (
        value === null ||
        typeof value === "string" ||
        (typeof value === "number" && Number.isFinite(value))
      ) {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  private normalizeImpactData(impactData: Record<string, unknown> | null): EventImpactView {
    return {
      downPaymentRequired: this.toInteger(impactData?.downPaymentRequired),
      fitnessScoreImpact: this.toInteger(impactData?.fitnessScoreImpact),
      monthlyMortgageCost: this.toInteger(impactData?.monthlyMortgageCost),
      netWorthImpactPct: this.toNumber(impactData?.netWorthImpactPct),
    };
  }

  private normalizeEventStatus(status: string): EventStatus {
    if (status === "completed" || status === "cancelled") {
      return status;
    }

    return "active";
  }

  private normalizeActionCategory(category: string): EventActionCategory {
    if (category === "financial" || category === "legal" || category === "insurance" || category === "tax") {
      return category;
    }

    return "planning";
  }

  private normalizeActionPriority(priority: string): EventActionPriority {
    if (priority === "critical" || priority === "high" || priority === "low") {
      return priority;
    }

    return "medium";
  }

  private normalizeActionStatus(status: string): EventActionStatus {
    if (status === "completed" || status === "skipped") {
      return status;
    }

    return "pending";
  }

  private resolveProfileLabel(profile: ProfileRow): string {
    return profile.display_name ?? profile.email ?? "Household member";
  }

  private async resolveAssignedToUserId(
    supabase: SupabaseClient,
    householdId: string,
    currentUserId: string,
    assignedTo: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (assignedTo === undefined) {
      return undefined;
    }

    if (assignedTo === null) {
      return null;
    }

    if (isUuid(assignedTo)) {
      await this.requireHouseholdMemberByUserId(supabase, householdId, assignedTo);
      return assignedTo;
    }

    const members = await this.getActiveHouseholdMembers(supabase, householdId);
    const otherMembers = members.filter((member) => member.user_id !== currentUserId);

    if (otherMembers.length === 1) {
      return otherMembers[0]?.user_id ?? null;
    }

    if (otherMembers.length === 0) {
      throw ServiceError.validation("No other active household member is available for assignment");
    }

    throw ServiceError.validation("assignedTo placeholder is ambiguous for this household");
  }

  private extractTargetDate(inputs: Record<string, unknown>): string | null {
    const candidateKeys = [
      "targetDate",
      "dueDate",
      "startDate",
      "receivedDate",
      "retirementDate",
      "weddingDate",
    ];

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

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
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
    const getBalanceSheet =
      this.dependencies.getBalanceSheet ??
      ((context: AuthContext, requestedHouseholdId: string) =>
        balanceSheetService.getBalanceSheet(context, requestedHouseholdId));

    try {
      const balanceSheet = await getBalanceSheet(authContext, householdId);
      currentNetWorth = balanceSheet.totalNetWorth;
    } catch {
      currentNetWorth = null;
    }

    if (eventType === "buying_apartment") {
      const budget = this.toInteger(inputs.budget) ?? 0;
      const downPaymentRequired = budget > 0 ? Math.round(budget * 0.15) : null;
      const mortgagePrincipal =
        budget > 0 && downPaymentRequired !== null
          ? Math.max(0, budget - downPaymentRequired)
          : null;
      const monthlyMortgageCost =
        mortgagePrincipal !== null
          ? Math.round((mortgagePrincipal * 0.04) / 12 + (mortgagePrincipal * 0.02) / 12)
          : null;
      const netWorthImpactPct =
        downPaymentRequired !== null && currentNetWorth && currentNetWorth > 0
          ? -roundTo((downPaymentRequired / currentNetWorth) * 100, 1)
          : -12;
      const fitnessScoreImpact = -Math.min(
        120,
        Math.max(12, Math.round(Math.abs(netWorthImpactPct) * 2.5)),
      );

      return {
        summary:
          budget > 0
            ? `Based on a ${formatSek(budget)} apartment purchase, the immediate liquidity impact is concentrated in the required down payment.`
            : "Apartment purchase impact estimated from standard Swedish mortgage assumptions.",
        data: {
          downPaymentRequired,
          fitnessScoreImpact,
          monthlyMortgageCost,
          netWorthImpactPct,
        },
      };
    }

    if (eventType === "having_child") {
      const monthlyChildcareCost = this.toInteger(inputs.monthlyChildcareCost) ?? null;

      return {
        summary:
          "Expected childcare and household spending increases are reflected in the planning baseline.",
        data: {
          annualCostIncrease:
            monthlyChildcareCost !== null
              ? monthlyChildcareCost * 12
              : 72_000_00,
          fitnessScoreImpact: -18,
        },
      };
    }

    if (eventType === "changing_jobs") {
      const salaryDelta =
        this.toInteger(inputs.salaryDelta) ?? this.toInteger(inputs.newSalary) ?? 0;

      return {
        summary: "Job change impact estimated from salary delta and transition timing assumptions.",
        data: {
          fitnessScoreImpact: salaryDelta >= 0 ? 12 : -12,
          monthlyIncomeDelta: salaryDelta,
        },
      };
    }

    if (eventType === "inheritance") {
      const inheritanceAmount =
        this.toInteger(inputs.inheritanceAmount) ?? this.toInteger(inputs.amount) ?? null;

      return {
        summary:
          "Inheritance planning includes cash deployment, tax handling, and long-term allocation steps.",
        data: {
          fitnessScoreImpact: 20,
          inheritanceAmount,
        },
      };
    }

    if (eventType === "retirement") {
      return {
        summary:
          "Retirement readiness projection reflects drawdown pressure and income replacement requirements.",
        data: {
          fitnessScoreImpact: -10,
        },
      };
    }

    if (eventType === "marriage") {
      return {
        summary:
          "Marriage planning impact includes one-time costs and updated household governance actions.",
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
          category: "financial",
          description:
            "Estimate safe borrowing capacity from income, debt ratio, and cash buffer.",
          estimatedImpactDescription: "Defines your realistic purchase range.",
          priority: "critical",
          title: "Calculate maximum mortgage capacity",
        },
        {
          category: "financial",
          description:
            "Set and track monthly transfers to meet the minimum 15% down-payment.",
          estimatedImpactDescription: "Improves purchase readiness and execution confidence.",
          priority: "critical",
          title: "Lock a down-payment savings target",
        },
        {
          category: "legal",
          description:
            "Prepare budget for stamp duty, registration, and transaction costs.",
          estimatedImpactDescription: "Avoids liquidity surprises at closing.",
          priority: "high",
          title: "Review legal purchase costs",
        },
        {
          category: "insurance",
          description:
            "Adjust household insurance scope before move-in and financing finalization.",
          estimatedImpactDescription: "Reduces downside risk around ownership transition.",
          priority: "high",
          title: "Evaluate home insurance coverage",
        },
        {
          category: "tax",
          description:
            "Rebalance investment wrappers to preserve liquidity around the purchase date.",
          estimatedImpactDescription: "Minimizes avoidable tax drag from forced sales.",
          priority: "medium",
          title: "Plan tax wrapper adjustments",
        },
        {
          category: "administrative",
          description:
            "Track key dates, required documents, and lender interactions in one checklist.",
          estimatedImpactDescription: "Keeps purchase process on schedule.",
          priority: "medium",
          title: "Prepare purchase administration checklist",
        },
      ];
    }

    return [
      {
        category: "financial",
        description:
          "Define event target state, timing, and measurable household constraints.",
        estimatedImpactDescription: "Creates a concrete planning baseline.",
        priority: "high",
        title: "Clarify financial objective and deadline",
      },
      {
        category: "legal",
        description:
          "Review legal prerequisites and required records before key milestones.",
        estimatedImpactDescription: "Reduces legal process risk.",
        priority: "high",
        title: "Validate legal and documentation requirements",
      },
      {
        category: "insurance",
        description:
          "Confirm insurance scope and beneficiary setup for event-related changes.",
        estimatedImpactDescription: "Improves resilience to unforeseen setbacks.",
        priority: "medium",
        title: "Review insurance and risk coverage",
      },
      {
        category: "tax",
        description:
          "Assess tax consequences and optimal execution windows for planned actions.",
        estimatedImpactDescription: "Improves net retained value.",
        priority: "medium",
        title: "Check tax implications and timing",
      },
      {
        category: "administrative",
        description:
          "Break down event milestones into clear owner-assigned operational tasks.",
        estimatedImpactDescription: "Improves completion reliability.",
        priority: "medium",
        title: "Create execution checklist",
      },
    ];
  }
}

export const eventService = new EventService();
