import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import { ServiceError } from "@/services/errors";

interface HouseholdMembershipRow {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "invited" | "removed";
}

interface HouseholdRow {
  id: string;
  name: string;
  created_by: string;
  is_demo: boolean;
}

interface ProposalCleanupRow {
  id: string;
  status: string;
  approved_by: unknown;
  rejected_by: string | null;
  requires_approval_from: unknown;
  resolved_at: string | null;
}

interface TimelineLinkedAccountsRow {
  id: string;
  linked_account_ids: string[] | null;
}

interface UserProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  base_currency: string;
  locale: string;
  onboarding_completed: boolean;
  is_demo_user: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

type ExportRecord = Record<string, unknown>;

type FilterableQuery = PromiseLike<{ data: ExportRecord[] | null; error: unknown }> & {
  eq: (field: string, value: unknown) => FilterableQuery;
  in: (field: string, values: string[]) => FilterableQuery;
};

export interface UserDataExport {
  metadata: {
    formatVersion: 1;
    generatedAt: string;
  };
  profile: UserProfileRow | null;
  households: {
    memberships: ExportRecord[];
    households: ExportRecord[];
  };
  accounts: {
    accounts: ExportRecord[];
    holdings: ExportRecord[];
    transactions: ExportRecord[];
    snapshots: ExportRecord[];
  };
  imports: {
    jobs: ExportRecord[];
    rows: ExportRecord[];
  };
  activity: {
    proposals: ExportRecord[];
    proposalComments: ExportRecord[];
    proposalApprovals: ExportRecord[];
    timelineEntries: ExportRecord[];
    lifeEvents: ExportRecord[];
    playbookActions: ExportRecord[];
    auditLog: ExportRecord[];
  };
}

const successorRoleOrder: HouseholdMembershipRow["role"][] = ["owner", "admin", "member", "viewer"];

function normalizeUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export function selectHouseholdDeletionSuccessor(
  members: HouseholdMembershipRow[],
  deletedUserId: string,
): HouseholdMembershipRow | null {
  const candidates = members.filter(
    (member) => member.user_id !== deletedUserId && member.status === "active",
  );

  for (const role of successorRoleOrder) {
    const match = candidates.find((member) => member.role === role);
    if (match) {
      return match;
    }
  }

  return null;
}

export function pruneDeletedUserFromProposal(
  proposal: ProposalCleanupRow,
  deletedUserId: string,
): {
  status: string;
  approved_by: string[];
  rejected_by: string | null;
  requires_approval_from: string[];
  resolved_at: string | null;
} {
  const approvedBy = normalizeUuidArray(proposal.approved_by).filter((entry) => entry !== deletedUserId);
  const requiredApprovers = normalizeUuidArray(proposal.requires_approval_from).filter(
    (entry) => entry !== deletedUserId,
  );
  const rejectedBy = proposal.rejected_by === deletedUserId ? null : proposal.rejected_by;

  if (proposal.status === "rejected" && rejectedBy === null) {
    return {
      status: "pending",
      approved_by: approvedBy,
      rejected_by: null,
      requires_approval_from: requiredApprovers,
      resolved_at: null,
    };
  }

  return {
    status: proposal.status,
    approved_by: approvedBy,
    rejected_by: rejectedBy,
    requires_approval_from: requiredApprovers,
    resolved_at: proposal.status === "pending" ? null : proposal.resolved_at,
  };
}

export function buildDeletedEmailAlias(userId: string): string {
  return `deleted+${userId.replace(/-/gu, "")}@deleted.fyrk.local`;
}

export class PrivacyService {
  constructor(
    private readonly createServiceRoleClient: () => SupabaseClient = createServiceRoleSupabaseClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async exportUserData(authContext: AuthContext): Promise<UserDataExport> {
    const supabase = this.createServiceRoleClient();
    const generatedAt = this.now().toISOString();

    const profile = await this.getProfileById(supabase, authContext.user.id);
    const memberships = await this.listRows(
      supabase,
      "household_members",
      "id, household_id, user_id, role, status, invited_email, invited_at, joined_at, created_at, updated_at",
      (request) => request.eq("user_id", authContext.user.id),
    );

    const householdIds = Array.from(
      new Set(
        memberships
          .map((row) => row.household_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    const households =
      householdIds.length > 0
        ? await this.listRows(
            supabase,
            "households",
            "id, name, type, base_currency, is_demo, demo_variant, created_by, created_at, updated_at, deleted_at",
            (request) => request.in("id", householdIds),
          )
        : [];

    const accounts = await this.listRows(
      supabase,
      "accounts",
      "id, household_id, owner_user_id, provider_id, provider_name, name, account_type, wrapper_type, currency, visibility, sync_source, notes, is_active, created_at, updated_at, deleted_at",
      (request) => request.eq("owner_user_id", authContext.user.id),
    );
    const accountIds = accounts
      .map((row) => row.id)
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    const holdings =
      accountIds.length > 0
        ? await this.listRows(
            supabase,
            "holdings",
            "id, account_id, instrument_id, quantity, average_cost, cost_currency, market_value, value_currency, as_of_date, source, created_at, updated_at, deleted_at",
            (request) => request.in("account_id", accountIds),
          )
        : [];
    const transactions =
      accountIds.length > 0
        ? await this.listRows(
            supabase,
            "transactions",
            "id, account_id, instrument_id, type, quantity, price, amount, currency, fee_amount, fee_currency, fx_rate, fx_amount, fx_currency, transaction_date, settlement_date, description, external_ref, source, created_at, updated_at, deleted_at",
            (request) => request.in("account_id", accountIds),
          )
        : [];
    const snapshots =
      accountIds.length > 0
        ? await this.listRows(
            supabase,
            "account_snapshots",
            "id, account_id, snapshot_date, total_value, cash_balance, currency, created_at",
            (request) => request.in("account_id", accountIds),
          )
        : [];

    const importJobs = await this.listRows(
      supabase,
      "import_jobs",
      "id, account_id, created_by, format, status, rows_parsed, holdings_detected, transactions_detected, instruments_resolved, instruments_unresolved, file_name, file_checksum, preview, error_message, confirmed_at, expires_at, created_at, updated_at, deleted_at",
      (request) => request.eq("created_by", authContext.user.id),
    );
    const importJobIds = importJobs
      .map((row) => row.id)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const importRows =
      importJobIds.length > 0
        ? await this.listRows(
            supabase,
            "import_rows",
            "id, import_job_id, row_index, row_kind, raw_data, normalized_data, validation_errors, resolution_status, instrument_id, dedupe_key, applied, created_at, updated_at, deleted_at",
            (request) => request.in("import_job_id", importJobIds),
          )
        : [];

    const proposals = await this.listRows(
      supabase,
      "proposals",
      "id, household_id, created_by, title, description, category, impact_analysis, status, requires_approval_from, approved_by, rejected_by, resolved_at, timeline_entry_id, created_at, updated_at, deleted_at",
      (request) => request.eq("created_by", authContext.user.id),
    );
    const proposalComments = await this.listRows(
      supabase,
      "proposal_comments",
      "id, proposal_id, user_id, content, created_at, updated_at, deleted_at",
      (request) => request.eq("user_id", authContext.user.id),
    );
    const proposalApprovals = await this.listRows(
      supabase,
      "proposal_approvals",
      "id, proposal_id, approver_user_id, status, decision_reason, decided_at, created_at, updated_at",
      (request) => request.eq("approver_user_id", authContext.user.id),
    );
    const timelineEntries = await this.listRows(
      supabase,
      "timeline_entries",
      "id, household_id, created_by, entry_type, category, title, description, reasoning, expected_outcome, linked_account_ids, linked_proposal_id, linked_review_id, linked_event_id, entry_date, is_future, metadata, created_at, updated_at, deleted_at",
      (request) => request.eq("created_by", authContext.user.id),
    );
    const lifeEvents = await this.listRows(
      supabase,
      "life_events",
      "id, household_id, triggered_by, event_type, title, status, inputs, impact_summary, impact_data, target_date, completed_at, timeline_entry_id, created_at, updated_at, deleted_at",
      (request) => request.eq("triggered_by", authContext.user.id),
    );
    const playbookActions = await this.listRows(
      supabase,
      "playbook_actions",
      "id, life_event_id, title, description, category, priority, sort_order, assigned_to, status, estimated_impact_amount, estimated_impact_description, completed_at, completion_notes, created_at, updated_at",
      (request) => request.eq("assigned_to", authContext.user.id),
    );
    const auditLog = await this.listRows(
      supabase,
      "audit_log",
      "id, household_id, user_id, action, entity_type, entity_id, changes, metadata, ip_address, user_agent, created_at",
      (request) => request.eq("user_id", authContext.user.id),
    );

    return {
      metadata: {
        formatVersion: 1,
        generatedAt,
      },
      profile,
      households: {
        memberships,
        households,
      },
      accounts: {
        accounts,
        holdings,
        transactions,
        snapshots,
      },
      imports: {
        jobs: importJobs,
        rows: importRows,
      },
      activity: {
        proposals,
        proposalComments,
        proposalApprovals,
        timelineEntries,
        lifeEvents,
        playbookActions,
        auditLog,
      },
    };
  }

  async deleteAccount(
    authContext: AuthContext,
  ): Promise<{ deleted: true; deletedAt: string; anonymizedEmail: string }> {
    const supabase = this.createServiceRoleClient();
    const deletedAt = this.now().toISOString();
    const anonymizedEmail = buildDeletedEmailAlias(authContext.user.id);
    const memberships = await this.listHouseholdMemberships(supabase, authContext.user.id);
    const householdIds = Array.from(new Set(memberships.map((membership) => membership.household_id)));
    const households = await this.listHouseholdsByIds(supabase, householdIds);
    const survivingHouseholdIds = new Set<string>();

    for (const household of households) {
      const activeMembers = await this.listActiveHouseholdMembers(supabase, household.id);
      const remainingMembers = activeMembers.filter((member) => member.user_id !== authContext.user.id);

      if (remainingMembers.length === 0 && !household.is_demo) {
        await this.deleteByIds(supabase, "households", [household.id]);
        continue;
      }

      survivingHouseholdIds.add(household.id);
      const successor = selectHouseholdDeletionSuccessor(activeMembers, authContext.user.id);
      const hasOwnerAfterDeletion = remainingMembers.some((member) => member.role === "owner");
      const deletedMembership = activeMembers.find((member) => member.user_id === authContext.user.id) ?? null;

      if (household.created_by === authContext.user.id && successor) {
        const { error } = await supabase
          .from("households")
          .update({
            created_by: successor.user_id,
            updated_at: deletedAt,
          })
          .eq("id", household.id);

        if (error) {
          throw error;
        }
      }

      if (deletedMembership?.role === "owner" && !hasOwnerAfterDeletion && successor) {
        const { error } = await supabase
          .from("household_members")
          .update({
            role: "owner",
            updated_at: deletedAt,
          })
          .eq("id", successor.id);

        if (error) {
          throw error;
        }
      }
    }

    await this.deleteUserAccounts(supabase, authContext.user.id);
    await this.cleanupProposals(supabase, Array.from(survivingHouseholdIds), authContext.user.id);
    await this.cleanupTimelineLinkedAccounts(supabase, Array.from(survivingHouseholdIds));
    await this.clearPlaybookAssignments(supabase, authContext.user.id, deletedAt);
    await this.deleteByField(supabase, "household_members", "user_id", authContext.user.id);
    await this.deleteDerivedHouseholdData(supabase, Array.from(survivingHouseholdIds));
    await this.scrubProfile(supabase, authContext.user.id, anonymizedEmail, deletedAt);

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(authContext.user.id, {
      email: anonymizedEmail,
      email_confirm: true,
      user_metadata: {
        gdprDeletedAt: deletedAt,
      },
    });

    if (authUpdateError) {
      throw authUpdateError;
    }

    const { error: revokeError } = await supabase.auth.admin.signOut(
      authContext.session.access_token,
      "global",
    );

    if (revokeError) {
      throw revokeError;
    }

    const { error: signOutError } = await authContext.supabase.auth.signOut({ scope: "global" });
    if (signOutError) {
      throw signOutError;
    }

    return {
      deleted: true,
      deletedAt,
      anonymizedEmail,
    };
  }

  private async getProfileById(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<UserProfileRow | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, display_name, avatar_url, base_currency, locale, onboarding_completed, is_demo_user, created_at, updated_at, deleted_at",
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as UserProfileRow | null) ?? null;
  }

  private async listRows(
    supabase: SupabaseClient,
    table: string,
    columns: string,
    applyFilters: (request: FilterableQuery) => FilterableQuery,
  ): Promise<ExportRecord[]> {
    const request = applyFilters(supabase.from(table).select(columns) as unknown as FilterableQuery);
    const { data, error } = await request;

    if (error) {
      throw error;
    }

    return ((data ?? []) as ExportRecord[]).map((row) => ({ ...row }));
  }

  private async listHouseholdMemberships(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<HouseholdMembershipRow[]> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status")
      .eq("user_id", userId)
      .neq("status", "removed");

    if (error) {
      throw error;
    }

    return (data ?? []) as HouseholdMembershipRow[];
  }

  private async listHouseholdsByIds(
    supabase: SupabaseClient,
    householdIds: string[],
  ): Promise<HouseholdRow[]> {
    if (householdIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("households")
      .select("id, name, created_by, is_demo")
      .in("id", householdIds);

    if (error) {
      throw error;
    }

    return (data ?? []) as HouseholdRow[];
  }

  private async listActiveHouseholdMembers(
    supabase: SupabaseClient,
    householdId: string,
  ): Promise<HouseholdMembershipRow[]> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status")
      .eq("household_id", householdId)
      .eq("status", "active");

    if (error) {
      throw error;
    }

    return (data ?? []) as HouseholdMembershipRow[];
  }

  private async deleteUserAccounts(supabase: SupabaseClient, userId: string): Promise<void> {
    const { data: accountRows, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("owner_user_id", userId);

    if (accountError) {
      throw accountError;
    }

    const accountIds = ((accountRows ?? []) as Array<{ id: string }>).map((row) => row.id);
    if (accountIds.length === 0) {
      return;
    }

    await this.deleteByIds(supabase, "accounts", accountIds);
  }

  private async cleanupProposals(
    supabase: SupabaseClient,
    householdIds: string[],
    userId: string,
  ): Promise<void> {
    if (householdIds.length === 0) {
      await this.deleteByField(supabase, "proposal_comments", "user_id", userId);
      await this.deleteByField(supabase, "proposal_approvals", "approver_user_id", userId);
      return;
    }

    const { data, error } = await supabase
      .from("proposals")
      .select("id, household_id, created_by, status, approved_by, rejected_by, requires_approval_from, resolved_at")
      .in("household_id", householdIds);

    if (error) {
      throw error;
    }

    const proposals = (data ?? []) as Array<ProposalCleanupRow & { created_by: string }>;
    const createdByUserIds = proposals
      .filter((proposal) => proposal.created_by === userId)
      .map((proposal) => proposal.id);

    if (createdByUserIds.length > 0) {
      await this.deleteByIds(supabase, "proposals", createdByUserIds);
    }

    await this.deleteByField(supabase, "proposal_comments", "user_id", userId);
    await this.deleteByField(supabase, "proposal_approvals", "approver_user_id", userId);

    for (const proposal of proposals) {
      if (proposal.created_by === userId) {
        continue;
      }

      const nextState = pruneDeletedUserFromProposal(proposal, userId);
      const approvedBy = normalizeUuidArray(proposal.approved_by);
      const requiredApprovers = normalizeUuidArray(proposal.requires_approval_from);
      const changed =
        nextState.status !== proposal.status ||
        nextState.rejected_by !== proposal.rejected_by ||
        nextState.resolved_at !== proposal.resolved_at ||
        nextState.approved_by.length !== approvedBy.length ||
        nextState.requires_approval_from.length !== requiredApprovers.length;

      if (!changed) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("proposals")
        .update(nextState)
        .eq("id", proposal.id);

      if (updateError) {
        throw updateError;
      }
    }
  }

  private async cleanupTimelineLinkedAccounts(
    supabase: SupabaseClient,
    householdIds: string[],
  ): Promise<void> {
    if (householdIds.length === 0) {
      return;
    }

    const { data: accounts, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .in("household_id", householdIds);

    if (accountError) {
      throw accountError;
    }

    const existingAccountIds = new Set(
      ((accounts ?? []) as Array<{ id: string }>).map((row) => row.id),
    );
    const { data: timelineRows, error: timelineError } = await supabase
      .from("timeline_entries")
      .select("id, linked_account_ids")
      .in("household_id", householdIds)
      .is("deleted_at", null);

    if (timelineError) {
      throw timelineError;
    }

    for (const row of (timelineRows ?? []) as TimelineLinkedAccountsRow[]) {
      const nextLinkedAccounts = (row.linked_account_ids ?? []).filter((id) => existingAccountIds.has(id));
      const currentLinkedAccounts = row.linked_account_ids ?? [];

      if (nextLinkedAccounts.length === currentLinkedAccounts.length) {
        continue;
      }

      const { error } = await supabase
        .from("timeline_entries")
        .update({
          linked_account_ids: nextLinkedAccounts.length > 0 ? nextLinkedAccounts : null,
          updated_at: this.now().toISOString(),
        })
        .eq("id", row.id);

      if (error) {
        throw error;
      }
    }
  }

  private async clearPlaybookAssignments(
    supabase: SupabaseClient,
    userId: string,
    deletedAt: string,
  ): Promise<void> {
    const { error } = await supabase
      .from("playbook_actions")
      .update({
        assigned_to: null,
        updated_at: deletedAt,
      })
      .eq("assigned_to", userId);

    if (error) {
      throw error;
    }
  }

  private async deleteDerivedHouseholdData(
    supabase: SupabaseClient,
    householdIds: string[],
  ): Promise<void> {
    if (householdIds.length === 0) {
      return;
    }

    await this.deleteByFieldList(supabase, "household_snapshots", "household_id", householdIds);
    await this.deleteByFieldList(supabase, "weekly_narrative_cache", "household_id", householdIds);
    await this.deleteByFieldList(supabase, "fitness_scores", "household_id", householdIds);
    await this.deleteByFieldList(supabase, "quarterly_reviews", "household_id", householdIds);
  }

  private async scrubProfile(
    supabase: SupabaseClient,
    userId: string,
    email: string,
    deletedAt: string,
  ): Promise<void> {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      throw new ServiceError("NOT_FOUND", "Profile was not found");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        email,
        display_name: null,
        avatar_url: null,
        onboarding_completed: false,
        is_demo_user: false,
        deleted_at: deletedAt,
        updated_at: deletedAt,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  }

  private async deleteByIds(
    supabase: SupabaseClient,
    table: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const { error } = await supabase.from(table).delete().in("id", ids);

    if (error) {
      throw error;
    }
  }

  private async deleteByField(
    supabase: SupabaseClient,
    table: string,
    field: string,
    value: string,
  ): Promise<void> {
    const { error } = await supabase.from(table).delete().eq(field, value);

    if (error) {
      throw error;
    }
  }

  private async deleteByFieldList(
    supabase: SupabaseClient,
    table: string,
    field: string,
    values: string[],
  ): Promise<void> {
    if (values.length === 0) {
      return;
    }

    const { error } = await supabase.from(table).delete().in(field, values);

    if (error) {
      throw error;
    }
  }
}

export const privacyService = new PrivacyService();
