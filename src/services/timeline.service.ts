import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { assertHouseholdWritable } from "@/lib/demo";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import type {
  CreateTimelineEntryInput,
  TimelineQueryInput,
  UpdateTimelineEntryInput,
} from "@/lib/validations/timeline";
import { ServiceError } from "@/services/errors";
import type { AccountVisibility, HouseholdMemberStatus, HouseholdRole } from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface TimelineEntryRow {
  id: string;
  household_id: string;
  created_by: string;
  entry_type: string;
  category: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  expected_outcome: string | null;
  linked_account_ids: string[] | null;
  linked_proposal_id: string | null;
  linked_review_id: string | null;
  linked_event_id: string | null;
  entry_date: string;
  is_future: boolean;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AccountVisibilityRow {
  id: string;
  owner_user_id: string;
  visibility: string;
  is_active: boolean;
  deleted_at: string | null;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface LinkedEventRow {
  id: string;
  title: string;
  status: string;
}

interface TimelineEntryView {
  id: string;
  householdId: string;
  entryType: string;
  category: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  expectedOutcome: string | null;
  linkedAccountIds: string[];
  linkedProposalId: string | null;
  linkedReviewId: string | null;
  linkedEventId: string | null;
  entryDate: string;
  isFuture: boolean;
  metadata: Record<string, unknown>;
  createdBy: {
    id: string;
    displayName: string;
  };
  linkedEvent: {
    id: string;
    title: string;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface TimelineQueryResult {
  data: TimelineEntryView[];
  meta: {
    cursor: string | null;
    hasMore: boolean;
  };
}

const householdManagerRoles: HouseholdRole[] = ["owner", "admin"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export class TimelineService {
  async list(authContext: AuthContext, query: TimelineQueryInput): Promise<TimelineQueryResult> {
    const { supabase, user } = authContext;
    await this.requireHouseholdMembership(supabase, query.householdId, user.id);

    let request = supabase
      .from("timeline_entries")
      .select(
        "id, household_id, created_by, entry_type, category, title, description, reasoning, expected_outcome, linked_account_ids, linked_proposal_id, linked_review_id, linked_event_id, entry_date, is_future, metadata, created_at, updated_at, deleted_at",
      )
      .eq("household_id", query.householdId)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(query.limit + 1);

    if (query.types.length > 0) {
      request = request.in("entry_type", query.types);
    }

    if (query.from) {
      request = request.gte("entry_date", query.from);
    }

    if (query.cursor) {
      request = request.lt("id", query.cursor);
    }

    const { data, error } = await request;

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as TimelineEntryRow[];
    const hasMore = rows.length > query.limit;
    const pageRows = hasMore ? rows.slice(0, query.limit) : rows;
    const mapped = await this.mapTimelineEntries(authContext, pageRows);

    return {
      data: mapped,
      meta: {
        cursor: mapped[mapped.length - 1]?.id ?? null,
        hasMore,
      },
    };
  }

  async create(authContext: AuthContext, input: CreateTimelineEntryInput): Promise<TimelineEntryView> {
    const { supabase, user } = authContext;
    await this.requireHouseholdMembership(supabase, input.householdId, user.id);
    await assertHouseholdWritable(supabase, input.householdId);

    const linkedAccountIds = await this.assertLinkedAccountsAreVisible(
      supabase,
      input.householdId,
      user.id,
      input.linkedAccountIds ?? [],
    );

    const entryDate = input.entryDate;
    const isFuture = input.isFuture || entryDate > todayIsoDate();

    const { data, error } = await supabase
      .from("timeline_entries")
      .insert({
        household_id: input.householdId,
        created_by: user.id,
        entry_type: input.entryType,
        category: input.category ?? null,
        title: input.title,
        description: input.description ?? null,
        reasoning: input.reasoning ?? null,
        expected_outcome: input.expectedOutcome ?? null,
        linked_account_ids: linkedAccountIds.length > 0 ? linkedAccountIds : null,
        linked_proposal_id: input.linkedProposalId ?? null,
        linked_review_id: input.linkedReviewId ?? null,
        linked_event_id: input.linkedEventId ?? null,
        entry_date: entryDate,
        is_future: isFuture,
        metadata: input.metadata,
      })
      .select(
        "id, household_id, created_by, entry_type, category, title, description, reasoning, expected_outcome, linked_account_ids, linked_proposal_id, linked_review_id, linked_event_id, entry_date, is_future, metadata, created_at, updated_at, deleted_at",
      )
      .single();

    if (error) {
      throw error;
    }

    const row = data as TimelineEntryRow;
    const mapped = await this.mapTimelineEntries(authContext, [row]);
    const entry = mapped[0];

    if (!entry) {
      throw new ServiceError("INTERNAL_ERROR", "Unable to map timeline entry response");
    }

    return entry;
  }

  async update(
    authContext: AuthContext,
    timelineEntryId: string,
    input: UpdateTimelineEntryInput,
  ): Promise<TimelineEntryView> {
    const access = await this.requireTimelineWriteAccess(authContext, timelineEntryId);
    const updatePayload: Record<string, unknown> = {};

    if (input.entryType !== undefined) {
      updatePayload.entry_type = input.entryType;
    }

    if (input.category !== undefined) {
      updatePayload.category = input.category;
    }

    if (input.title !== undefined) {
      updatePayload.title = input.title;
    }

    if (input.description !== undefined) {
      updatePayload.description = input.description;
    }

    if (input.reasoning !== undefined) {
      updatePayload.reasoning = input.reasoning;
    }

    if (input.expectedOutcome !== undefined) {
      updatePayload.expected_outcome = input.expectedOutcome;
    }

    if (input.linkedAccountIds !== undefined) {
      const linkedAccountIds = await this.assertLinkedAccountsAreVisible(
        authContext.supabase,
        access.entry.household_id,
        authContext.user.id,
        input.linkedAccountIds,
      );
      updatePayload.linked_account_ids = linkedAccountIds.length > 0 ? linkedAccountIds : null;
    }

    if (input.linkedProposalId !== undefined) {
      updatePayload.linked_proposal_id = input.linkedProposalId;
    }

    if (input.linkedReviewId !== undefined) {
      updatePayload.linked_review_id = input.linkedReviewId;
    }

    if (input.linkedEventId !== undefined) {
      updatePayload.linked_event_id = input.linkedEventId;
    }

    if (input.entryDate !== undefined) {
      updatePayload.entry_date = input.entryDate;
    }

    if (input.isFuture !== undefined) {
      updatePayload.is_future = input.isFuture;
    } else if (input.entryDate !== undefined) {
      updatePayload.is_future = input.entryDate > todayIsoDate();
    }

    if (input.metadata !== undefined) {
      updatePayload.metadata = input.metadata;
    }

    if (Object.keys(updatePayload).length === 0) {
      const mapped = await this.mapTimelineEntries(authContext, [access.entry]);
      const entry = mapped[0];
      if (!entry) {
        throw new ServiceError("INTERNAL_ERROR", "Unable to map timeline entry response");
      }
      return entry;
    }

    const { data, error } = await authContext.supabase
      .from("timeline_entries")
      .update(updatePayload)
      .eq("id", access.entry.id)
      .is("deleted_at", null)
      .select(
        "id, household_id, created_by, entry_type, category, title, description, reasoning, expected_outcome, linked_account_ids, linked_proposal_id, linked_review_id, linked_event_id, entry_date, is_future, metadata, created_at, updated_at, deleted_at",
      )
      .single();

    if (error) {
      throw error;
    }

    const row = data as TimelineEntryRow;
    const mapped = await this.mapTimelineEntries(authContext, [row]);
    const entry = mapped[0];

    if (!entry) {
      throw new ServiceError("INTERNAL_ERROR", "Unable to map timeline entry response");
    }

    return entry;
  }

  async remove(
    authContext: AuthContext,
    timelineEntryId: string,
  ): Promise<{ id: string; deleted: boolean }> {
    const access = await this.requireTimelineWriteAccess(authContext, timelineEntryId);
    const nowIso = new Date().toISOString();

    const { error } = await authContext.supabase
      .from("timeline_entries")
      .update({
        deleted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", access.entry.id)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    return {
      id: access.entry.id,
      deleted: true,
    };
  }

  private async mapTimelineEntries(
    authContext: AuthContext,
    rows: TimelineEntryRow[],
  ): Promise<TimelineEntryView[]> {
    if (rows.length === 0) {
      return [];
    }

    const profileMap = await this.getProfilesByUserIds(rows.map((row) => row.created_by));
    const eventMap = await this.getLinkedEventsByIds(
      authContext.supabase,
      rows
        .map((row) => row.linked_event_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    );

    return rows.map((row) => {
      const profile = profileMap.get(row.created_by);
      const linkedEvent = row.linked_event_id ? eventMap.get(row.linked_event_id) ?? null : null;
      const linkedAccountIds =
        Array.isArray(row.linked_account_ids) && row.linked_account_ids.length > 0
          ? row.linked_account_ids
          : [];

      return {
        id: row.id,
        householdId: row.household_id,
        entryType: row.entry_type,
        category: row.category,
        title: row.title,
        description: row.description,
        reasoning: row.reasoning,
        expectedOutcome: row.expected_outcome,
        linkedAccountIds,
        linkedProposalId: row.linked_proposal_id,
        linkedReviewId: row.linked_review_id,
        linkedEventId: row.linked_event_id,
        entryDate: row.entry_date,
        isFuture: row.is_future,
        metadata: isRecord(row.metadata) ? row.metadata : {},
        createdBy: {
          id: row.created_by,
          displayName: profile?.display_name ?? profile?.email ?? "Household member",
        },
        linkedEvent: linkedEvent
          ? {
              id: linkedEvent.id,
              title: linkedEvent.title,
              status: linkedEvent.status,
            }
          : null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  private async getLinkedEventsByIds(
    supabase: SupabaseClient,
    eventIds: string[],
  ): Promise<Map<string, LinkedEventRow>> {
    const uniqueIds = Array.from(new Set(eventIds.filter(Boolean)));
    const map = new Map<string, LinkedEventRow>();

    if (uniqueIds.length === 0) {
      return map;
    }

    const { data, error } = await supabase
      .from("life_events")
      .select("id, title, status")
      .in("id", uniqueIds)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as LinkedEventRow[]) {
      map.set(row.id, row);
    }

    return map;
  }

  private async getProfilesByUserIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const map = new Map<string, ProfileRow>();

    if (uniqueIds.length === 0) {
      return map;
    }

    const serviceRoleClient = createServiceRoleSupabaseClient();
    const { data, error } = await serviceRoleClient
      .from("profiles")
      .select("id, email, display_name")
      .in("id", uniqueIds);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as ProfileRow[]) {
      map.set(row.id, row);
    }

    return map;
  }

  private async requireTimelineWriteAccess(
    authContext: AuthContext,
    timelineEntryId: string,
  ): Promise<{ entry: TimelineEntryRow; membership: HouseholdMemberRow }> {
    const entry = await this.getTimelineEntryById(authContext.supabase, timelineEntryId);

    if (!entry || entry.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Timeline entry was not found");
    }

    const membership = await this.requireHouseholdMembership(
      authContext.supabase,
      entry.household_id,
      authContext.user.id,
    );
    await assertHouseholdWritable(authContext.supabase, entry.household_id);

    if (entry.created_by !== authContext.user.id && !householdManagerRoles.includes(membership.role)) {
      throw new ServiceError("FORBIDDEN", "You are not allowed to modify this timeline entry");
    }

    return {
      entry,
      membership,
    };
  }

  private async getTimelineEntryById(
    supabase: SupabaseClient,
    timelineEntryId: string,
  ): Promise<TimelineEntryRow | null> {
    const { data, error } = await supabase
      .from("timeline_entries")
      .select(
        "id, household_id, created_by, entry_type, category, title, description, reasoning, expected_outcome, linked_account_ids, linked_proposal_id, linked_review_id, linked_event_id, entry_date, is_future, metadata, created_at, updated_at, deleted_at",
      )
      .eq("id", timelineEntryId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as TimelineEntryRow | null) ?? null;
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

  private async assertLinkedAccountsAreVisible(
    supabase: SupabaseClient,
    householdId: string,
    requestingUserId: string,
    linkedAccountIds: string[],
  ): Promise<string[]> {
    const uniqueIds = Array.from(new Set(linkedAccountIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("accounts")
      .select("id, owner_user_id, visibility, is_active, deleted_at")
      .eq("household_id", householdId)
      .in("id", uniqueIds);

    if (error) {
      throw error;
    }

    const visibleIds = new Set<string>();

    for (const row of (data ?? []) as AccountVisibilityRow[]) {
      if (!row.is_active || row.deleted_at) {
        continue;
      }

      const visibility = this.normalizeVisibility(row.visibility);
      const isOwner = row.owner_user_id === requestingUserId;
      if (isOwner || visibility !== "private") {
        visibleIds.add(row.id);
      }
    }

    if (visibleIds.size !== uniqueIds.length) {
      throw ServiceError.validation("One or more linked accounts are not visible to the current user");
    }

    return uniqueIds;
  }

  private normalizeVisibility(visibility: string): AccountVisibility {
    if (visibility === "hidden") {
      return "amount_hidden";
    }

    if (visibility === "full" || visibility === "amount_hidden" || visibility === "private") {
      return visibility;
    }

    return "private";
  }
}

export const timelineService = new TimelineService();
