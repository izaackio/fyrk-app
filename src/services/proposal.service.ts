import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { assertHouseholdWritable } from "@/lib/demo";
import type {
  CreateProposalInput,
  ProposalCommentInput,
  ProposalListQueryInput,
  ProposalRejectInput,
} from "@/lib/validations/proposals";
import { ServiceError } from "@/services/errors";
import type {
  HouseholdMemberStatus,
  HouseholdRole,
  ProposalCategory,
  ProposalCommentView,
  ProposalImpactAnalysisView,
  ProposalStatus,
  ProposalView,
} from "@/types/domain";

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

interface ProposalRow {
  id: string;
  household_id: string;
  created_by: string;
  title: string;
  description: string;
  category: string;
  impact_analysis: unknown;
  status: string;
  requires_approval_from: unknown;
  approved_by: unknown;
  rejected_by: string | null;
  resolved_at: string | null;
  timeline_entry_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface ProposalCommentRow {
  id: string;
  proposal_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

export interface ProposalTransitionState {
  status: ProposalStatus;
  requiresApprovalFrom: string[];
  approvedBy: string[];
  rejectedBy: string | null;
  resolvedAt: string | null;
}

type ProposalTransitionAction =
  | { type: "approve"; actorId: string }
  | { type: "reject"; actorId: string };

export interface ProposalTransitionResult {
  next: ProposalTransitionState;
  changed: boolean;
}

const householdWritableRoles: HouseholdRole[] = ["owner", "admin", "member"];
const approverRoles: HouseholdRole[] = ["owner", "admin", "member"];

const proposalSelectColumns = [
  "id",
  "household_id",
  "created_by",
  "title",
  "description",
  "category",
  "impact_analysis",
  "status",
  "requires_approval_from",
  "approved_by",
  "rejected_by",
  "resolved_at",
  "timeline_entry_id",
  "created_at",
  "updated_at",
  "deleted_at",
].join(", ");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const output: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !entry) {
      continue;
    }

    if (!seen.has(entry)) {
      seen.add(entry);
      output.push(entry);
    }
  }

  return output;
}

function toProposalStatus(value: string): ProposalStatus {
  if (value === "pending" || value === "approved" || value === "rejected" || value === "withdrawn") {
    return value;
  }

  return "pending";
}

function toProposalCategory(value: string): ProposalCategory {
  if (value === "investment" || value === "insurance" || value === "debt" || value === "savings") {
    return value;
  }

  return "other";
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** Math.max(0, decimals);
  return Math.round(value * factor) / factor;
}

function parseAmountMinor(text: string): number | null {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(/(\d+(?:[.,]\d+)?)(k|m|mn)?/i);

  if (!match) {
    return null;
  }

  const rawAmount = match[1];
  if (!rawAmount) {
    return null;
  }

  const numeric = Number.parseFloat(rawAmount.replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const suffix = (match[2] ?? "").toLowerCase();
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" || suffix === "mn" ? 1_000_000 : 1;
  return Math.round(numeric * multiplier * 100);
}

function buildDeterministicImpact(input: CreateProposalInput): ProposalImpactAnalysisView {
  const parsedAmountMinor = parseAmountMinor(`${input.title} ${input.description}`);
  const category = input.category;

  const componentByCategory: Record<ProposalCategory, string> = {
    investment: "growth",
    insurance: "protection",
    debt: "efficiency",
    savings: "buffer",
    other: "trajectory",
  };
  const component = componentByCategory[category];

  const pointsMagnitude = parsedAmountMinor
    ? Math.max(2, Math.min(12, Math.round(parsedAmountMinor / 5_000_000)))
    : 3;
  const points = category === "debt" ? Math.min(10, pointsMagnitude + 1) : pointsMagnitude;

  const allocationTo = parsedAmountMinor
    ? roundTo(Math.max(0.5, Math.min(25, parsedAmountMinor / 25_000_000)), 2)
    : 1.5;

  const riskLevel =
    parsedAmountMinor === null ? "moderate" : parsedAmountMinor >= 50_000_000 ? "elevated" : "moderate";
  const riskAssessment =
    riskLevel === "elevated"
      ? "Larger capital move. Validate timing, concentration, and liquidity before execution."
      : "Incremental change with manageable downside under normal market conditions.";

  return {
    allocationChange: {
      [category]: {
        from: 0,
        to: allocationTo,
      },
    },
    fitnessImpact: `+${points} (${component} component)`,
    riskAssessment,
    deterministicInputs: {
      parsedAmountMinor,
      category,
      modelVersion: "s5.v1",
    },
  };
}

function toTransitionState(row: ProposalRow): ProposalTransitionState {
  return {
    status: toProposalStatus(row.status),
    requiresApprovalFrom: normalizeUuidArray(row.requires_approval_from),
    approvedBy: normalizeUuidArray(row.approved_by),
    rejectedBy: row.rejected_by,
    resolvedAt: row.resolved_at,
  };
}

export function applyProposalTransition(
  state: ProposalTransitionState,
  action: ProposalTransitionAction,
  nowIso: string,
): ProposalTransitionResult {
  if (action.type === "approve") {
    if (state.status === "approved") {
      return { next: state, changed: false };
    }

    if (state.status === "rejected" || state.status === "withdrawn") {
      throw ServiceError.validation("Only pending proposals can be approved");
    }

    if (state.approvedBy.includes(action.actorId)) {
      return { next: state, changed: false };
    }

    const approvedBy = normalizeUuidArray([...state.approvedBy, action.actorId]);
    const isFullyApproved =
      state.requiresApprovalFrom.length === 0 ||
      state.requiresApprovalFrom.every((requiredId) => approvedBy.includes(requiredId));

    return {
      changed: true,
      next: {
        ...state,
        approvedBy,
        status: isFullyApproved ? "approved" : "pending",
        rejectedBy: null,
        resolvedAt: isFullyApproved ? state.resolvedAt ?? nowIso : null,
      },
    };
  }

  if (state.status === "rejected") {
    return { next: state, changed: false };
  }

  if (state.status === "approved" || state.status === "withdrawn") {
    throw ServiceError.validation("Only pending proposals can be rejected");
  }

  return {
    changed: true,
    next: {
      ...state,
      status: "rejected",
      rejectedBy: action.actorId,
      resolvedAt: state.resolvedAt ?? nowIso,
    },
  };
}

export class ProposalService {
  async create(authContext: AuthContext, input: CreateProposalInput): Promise<ProposalView> {
    await assertHouseholdWritable(authContext.supabase, input.householdId);
    const membership = await this.requireHouseholdMembership(
      authContext.supabase,
      input.householdId,
      authContext.user.id,
    );
    this.assertWritableRole(membership.role);

    const requiredApprovers = await this.listRequiredApprovers(
      authContext.supabase,
      input.householdId,
      authContext.user.id,
    );
    const impactAnalysis = buildDeterministicImpact(input);
    const nowIso = new Date().toISOString();
    const autoApproved = requiredApprovers.length === 0;

    const { data, error } = await authContext.supabase
      .from("proposals")
      .insert({
        household_id: input.householdId,
        created_by: authContext.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        impact_analysis: impactAnalysis,
        status: autoApproved ? "approved" : "pending",
        requires_approval_from: requiredApprovers,
        approved_by: autoApproved ? [authContext.user.id] : [],
        rejected_by: null,
        resolved_at: autoApproved ? nowIso : null,
      })
      .select(proposalSelectColumns)
      .single();

    if (error) {
      throw error;
    }

    let proposal = data as unknown as ProposalRow;
    proposal = await this.ensureResolutionTimelineEntry(authContext, proposal);

    await this.writeAuditLog(authContext, {
      householdId: proposal.household_id,
      action: "proposal.created",
      entityType: "proposal",
      entityId: proposal.id,
      changes: {
        status: { old: null, new: proposal.status },
      },
      metadata: {
        deterministic: true,
      },
    });

    if (autoApproved) {
      await this.writeAuditLog(authContext, {
        householdId: proposal.household_id,
        action: "proposal.approved",
        entityType: "proposal",
        entityId: proposal.id,
        changes: {
          status: { old: "pending", new: "approved" },
        },
        metadata: {
          autoApproved: true,
        },
      });
    }

    const profiles = new Map<string, ProfileRow>([
      [
        authContext.user.id,
        {
          id: authContext.user.id,
          email: authContext.profile.email,
          display_name: authContext.profile.display_name,
        },
      ],
    ]);

    return this.mapProposal(proposal, profiles, new Map([[proposal.id, 0]]));
  }

  async list(authContext: AuthContext, query: ProposalListQueryInput): Promise<ProposalView[]> {
    await this.requireHouseholdMembership(authContext.supabase, query.householdId, authContext.user.id);

    let request = authContext.supabase
      .from("proposals")
      .select(proposalSelectColumns)
      .eq("household_id", query.householdId)
      .is("deleted_at", null);

    if (query.status.length > 0) {
      request = request.in("status", query.status);
    }

    const { data, error } = await request.order("created_at", { ascending: false });
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as ProposalRow[];
    const creatorIds = Array.from(new Set(rows.map((row) => row.created_by)));
    const profiles = await this.getProfilesByUserIds(authContext.supabase, creatorIds);
    const commentCounts = await this.getCommentCounts(
      authContext.supabase,
      rows.map((row) => row.id),
    );

    return rows.map((row) => this.mapProposal(row, profiles, commentCounts));
  }

  async approve(authContext: AuthContext, proposalId: string): Promise<ProposalView> {
    const existing = await this.getProposalById(authContext.supabase, proposalId);
    if (!existing || existing.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Proposal was not found");
    }
    await assertHouseholdWritable(authContext.supabase, existing.household_id);

    const membership = await this.requireHouseholdMembership(
      authContext.supabase,
      existing.household_id,
      authContext.user.id,
    );
    this.assertWritableRole(membership.role);

    const transitionState = toTransitionState(existing);
    if (
      transitionState.status === "pending" &&
      transitionState.requiresApprovalFrom.length > 0 &&
      !transitionState.requiresApprovalFrom.includes(authContext.user.id) &&
      !transitionState.approvedBy.includes(authContext.user.id)
    ) {
      throw new ServiceError("FORBIDDEN", "You are not required to approve this proposal");
    }

    const transition = applyProposalTransition(
      transitionState,
      { type: "approve", actorId: authContext.user.id },
      new Date().toISOString(),
    );

    let nextRow = existing;
    if (transition.changed) {
      const { data, error } = await authContext.supabase
        .from("proposals")
        .update({
          status: transition.next.status,
          approved_by: transition.next.approvedBy,
          rejected_by: transition.next.rejectedBy,
          resolved_at: transition.next.resolvedAt,
        })
        .eq("id", existing.id)
        .select(proposalSelectColumns)
        .single();

      if (error) {
        throw error;
      }

      nextRow = data as unknown as ProposalRow;
      nextRow = await this.ensureResolutionTimelineEntry(authContext, nextRow);

      await this.writeAuditLog(authContext, {
        householdId: nextRow.household_id,
        action: "proposal.approved",
        entityType: "proposal",
        entityId: nextRow.id,
        changes: {
          status: { old: existing.status, new: nextRow.status },
          approvedBy: {
            old: normalizeUuidArray(existing.approved_by),
            new: normalizeUuidArray(nextRow.approved_by),
          },
        },
      });
    }

    const profiles = await this.getProfilesByUserIds(authContext.supabase, [nextRow.created_by]);
    const commentCounts = await this.getCommentCounts(authContext.supabase, [nextRow.id]);
    return this.mapProposal(nextRow, profiles, commentCounts);
  }

  async reject(
    authContext: AuthContext,
    proposalId: string,
    input: ProposalRejectInput,
  ): Promise<ProposalView> {
    const existing = await this.getProposalById(authContext.supabase, proposalId);
    if (!existing || existing.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Proposal was not found");
    }
    await assertHouseholdWritable(authContext.supabase, existing.household_id);

    const membership = await this.requireHouseholdMembership(
      authContext.supabase,
      existing.household_id,
      authContext.user.id,
    );
    this.assertWritableRole(membership.role);

    const transitionState = toTransitionState(existing);
    if (
      transitionState.status === "pending" &&
      transitionState.requiresApprovalFrom.length > 0 &&
      !transitionState.requiresApprovalFrom.includes(authContext.user.id) &&
      membership.role === "member" &&
      existing.created_by !== authContext.user.id
    ) {
      throw new ServiceError("FORBIDDEN", "You are not required to reject this proposal");
    }

    const transition = applyProposalTransition(
      transitionState,
      { type: "reject", actorId: authContext.user.id },
      new Date().toISOString(),
    );

    let nextRow = existing;
    if (transition.changed) {
      const { data, error } = await authContext.supabase
        .from("proposals")
        .update({
          status: transition.next.status,
          approved_by: transition.next.approvedBy,
          rejected_by: transition.next.rejectedBy,
          resolved_at: transition.next.resolvedAt,
        })
        .eq("id", existing.id)
        .select(proposalSelectColumns)
        .single();

      if (error) {
        throw error;
      }

      nextRow = data as unknown as ProposalRow;

      const { error: commentError } = await authContext.supabase.from("proposal_comments").insert({
        proposal_id: nextRow.id,
        user_id: authContext.user.id,
        content: input.reason,
      });

      if (commentError) {
        throw commentError;
      }

      nextRow = await this.ensureResolutionTimelineEntry(authContext, nextRow);

      await this.writeAuditLog(authContext, {
        householdId: nextRow.household_id,
        action: "proposal.rejected",
        entityType: "proposal",
        entityId: nextRow.id,
        changes: {
          status: { old: existing.status, new: nextRow.status },
          rejectedBy: { old: existing.rejected_by, new: nextRow.rejected_by },
        },
        metadata: {
          reason: input.reason,
        },
      });
    }

    const profiles = await this.getProfilesByUserIds(authContext.supabase, [nextRow.created_by]);
    const commentCounts = await this.getCommentCounts(authContext.supabase, [nextRow.id]);
    return this.mapProposal(nextRow, profiles, commentCounts);
  }

  async addComment(
    authContext: AuthContext,
    proposalId: string,
    input: ProposalCommentInput,
  ): Promise<ProposalCommentView> {
    const proposal = await this.getProposalById(authContext.supabase, proposalId);
    if (!proposal || proposal.deleted_at) {
      throw new ServiceError("NOT_FOUND", "Proposal was not found");
    }
    await assertHouseholdWritable(authContext.supabase, proposal.household_id);

    const membership = await this.requireHouseholdMembership(
      authContext.supabase,
      proposal.household_id,
      authContext.user.id,
    );
    this.assertWritableRole(membership.role);

    const { data, error } = await authContext.supabase
      .from("proposal_comments")
      .insert({
        proposal_id: proposal.id,
        user_id: authContext.user.id,
        content: input.content,
      })
      .select("id, proposal_id, user_id, content, created_at")
      .single();

    if (error) {
      throw error;
    }

    const comment = data as ProposalCommentRow;
    await this.writeAuditLog(authContext, {
      householdId: proposal.household_id,
      action: "proposal.commented",
      entityType: "proposal_comment",
      entityId: comment.id,
      metadata: {
        proposalId: proposal.id,
      },
    });

    return {
      id: comment.id,
      proposalId: comment.proposal_id,
      userId: comment.user_id,
      content: comment.content,
      createdAt: comment.created_at,
      author: {
        id: authContext.user.id,
        displayName: authContext.profile.display_name ?? authContext.profile.email,
      },
    };
  }

  private async ensureResolutionTimelineEntry(
    authContext: AuthContext,
    proposal: ProposalRow,
  ): Promise<ProposalRow> {
    const status = toProposalStatus(proposal.status);
    if (proposal.timeline_entry_id || (status !== "approved" && status !== "rejected")) {
      return proposal;
    }

    const { data: timelineEntry, error: timelineError } = await authContext.supabase
      .from("timeline_entries")
      .insert({
        household_id: proposal.household_id,
        created_by: authContext.user.id,
        entry_type: "decision",
        category: proposal.category === "investment" ? "investment" : "other",
        title:
          status === "approved"
            ? `Proposal approved: ${proposal.title}`
            : `Proposal rejected: ${proposal.title}`,
        description: proposal.description,
        linked_proposal_id: proposal.id,
        entry_date: toIsoDate(new Date()),
        is_future: false,
        metadata: {
          source: "proposal_service",
          proposalStatus: status,
        },
      })
      .select("id")
      .single();

    if (timelineError) {
      throw timelineError;
    }

    const timelineId = isRecord(timelineEntry) && typeof timelineEntry.id === "string" ? timelineEntry.id : null;
    if (!timelineId) {
      return proposal;
    }

    const { data, error } = await authContext.supabase
      .from("proposals")
      .update({
        timeline_entry_id: timelineId,
      })
      .eq("id", proposal.id)
      .select(proposalSelectColumns)
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as ProposalRow;
  }

  private async listRequiredApprovers(
    supabase: SupabaseClient,
    householdId: string,
    creatorUserId: string,
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from("household_members")
      .select("user_id, role, status")
      .eq("household_id", householdId)
      .eq("status", "active");

    if (error) {
      throw error;
    }

    return (data ?? [])
      .filter(
        (row) =>
          isRecord(row) &&
          typeof row.user_id === "string" &&
          row.user_id !== creatorUserId &&
          typeof row.role === "string" &&
          approverRoles.includes(row.role as HouseholdRole),
      )
      .map((row) => (row as { user_id: string }).user_id);
  }

  private mapProposal(
    row: ProposalRow,
    profiles: Map<string, ProfileRow>,
    commentCounts: Map<string, number>,
  ): ProposalView {
    const profile = profiles.get(row.created_by);

    return {
      id: row.id,
      householdId: row.household_id,
      title: row.title,
      description: row.description,
      category: toProposalCategory(row.category),
      impactAnalysis: isRecord(row.impact_analysis) ? row.impact_analysis : {},
      status: toProposalStatus(row.status),
      requiresApprovalFrom: normalizeUuidArray(row.requires_approval_from),
      approvedBy: normalizeUuidArray(row.approved_by),
      rejectedBy: row.rejected_by,
      resolvedAt: row.resolved_at,
      timelineEntryId: row.timeline_entry_id,
      commentsCount: commentCounts.get(row.id) ?? 0,
      createdBy: {
        id: row.created_by,
        displayName: profile?.display_name ?? profile?.email ?? "Household member",
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async getCommentCounts(
    supabase: SupabaseClient,
    proposalIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (proposalIds.length === 0) {
      return counts;
    }

    const { data, error } = await supabase
      .from("proposal_comments")
      .select("proposal_id")
      .in("proposal_id", proposalIds);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      if (!isRecord(row) || typeof row.proposal_id !== "string") {
        continue;
      }

      counts.set(row.proposal_id, (counts.get(row.proposal_id) ?? 0) + 1);
    }

    return counts;
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
      throw error;
    }

    for (const row of (data ?? []) as ProfileRow[]) {
      output.set(row.id, row);
    }

    return output;
  }

  private async getProposalById(
    supabase: SupabaseClient,
    proposalId: string,
  ): Promise<ProposalRow | null> {
    const { data, error } = await supabase
      .from("proposals")
      .select(proposalSelectColumns)
      .eq("id", proposalId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as unknown as ProposalRow | null) ?? null;
  }

  private assertWritableRole(role: HouseholdRole): void {
    if (!householdWritableRoles.includes(role)) {
      throw new ServiceError("FORBIDDEN", "You are not allowed to modify proposals");
    }
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

  private async writeAuditLog(
    authContext: AuthContext,
    input: {
      householdId: string;
      action: string;
      entityType: string;
      entityId: string;
      changes?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const { error } = await authContext.supabase.from("audit_log").insert({
      household_id: input.householdId,
      user_id: authContext.user.id,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      changes: input.changes ?? {},
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw error;
    }
  }
}

export const proposalService = new ProposalService();
