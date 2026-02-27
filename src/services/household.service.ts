import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import {
  createServiceRoleSupabaseClient,
  createStatelessSupabaseClient,
  getMagicLinkRedirectUrl,
} from "@/lib/auth/supabase";
import type {
  CreateHouseholdInput,
  InviteHouseholdMemberInput,
  UpdateHouseholdMemberInput,
} from "@/lib/validations/household";
import { ServiceError } from "@/services/errors";
import type {
  HouseholdManageableRole,
  HouseholdMemberStatus,
  HouseholdMemberView,
  HouseholdRole,
  HouseholdView,
} from "@/types/domain";

interface HouseholdRow {
  id: string;
  name: string;
  type: string;
  base_currency: string;
  created_at: string;
}

interface HouseholdMemberRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
  invited_email: string | null;
  invited_at: string | null;
  joined_at: string | null;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

const householdManagerRoles: HouseholdRole[] = ["owner", "admin"];

export class HouseholdService {
  async create(authContext: AuthContext, input: CreateHouseholdInput): Promise<HouseholdView> {
    const { supabase, user, profile } = authContext;

    const { data: householdData, error: householdError } = await supabase
      .from("households")
      .insert({
        name: input.name,
        base_currency: input.baseCurrency,
        created_by: user.id,
        type: "household",
      })
      .select("id, name, type, base_currency, created_at")
      .single();

    if (householdError) {
      throw householdError;
    }

    const nowIso = new Date().toISOString();
    const { data: ownerMemberData, error: ownerMemberError } = await supabase
      .from("household_members")
      .insert({
        household_id: householdData.id,
        user_id: user.id,
        role: "owner",
        status: "active",
        joined_at: nowIso,
      })
      .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
      .single();

    if (ownerMemberError) {
      throw ownerMemberError;
    }

    const household = householdData as HouseholdRow;
    const ownerMember = ownerMemberData as HouseholdMemberRow;

    return {
      id: household.id,
      name: household.name,
      type: household.type,
      baseCurrency: household.base_currency,
      createdAt: household.created_at,
      members: [
        {
          id: ownerMember.id,
          userId: ownerMember.user_id,
          role: ownerMember.role,
          status: ownerMember.status,
          displayName: profile.display_name,
          email: profile.email,
          invitedEmail: ownerMember.invited_email,
          joinedAt: ownerMember.joined_at,
        },
      ],
    };
  }

  async getById(authContext: AuthContext, householdId: string): Promise<HouseholdView> {
    const { supabase, user } = authContext;
    await this.requireActiveMembership(supabase, householdId, user.id);

    const { data: householdData, error: householdError } = await supabase
      .from("households")
      .select("id, name, type, base_currency, created_at")
      .eq("id", householdId)
      .maybeSingle();

    if (householdError) {
      throw householdError;
    }

    if (!householdData) {
      throw new ServiceError("NOT_FOUND", "Household was not found");
    }

    const { data: memberRows, error: memberRowsError } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });

    if (memberRowsError) {
      throw memberRowsError;
    }

    const members = (memberRows ?? []) as HouseholdMemberRow[];
    const profiles = await this.getProfilesByUserIds(members.map((member) => member.user_id));

    const household = householdData as HouseholdRow;
    return {
      id: household.id,
      name: household.name,
      type: household.type,
      baseCurrency: household.base_currency,
      createdAt: household.created_at,
      members: members.map((member) => this.mapMember(member, profiles)),
    };
  }

  async inviteMember(
    authContext: AuthContext,
    householdId: string,
    input: InviteHouseholdMemberInput,
  ): Promise<{ invitationId: string; email: string; status: "invited" }> {
    const { supabase, profile, user } = authContext;
    await this.requireManagerMembership(supabase, householdId, user.id);

    if (profile.email.toLowerCase() === input.email) {
      throw ServiceError.validation("You cannot invite your own email address");
    }

    const invitedProfile = await this.findOrCreateProfileByEmail(input.email);
    const invitedMember = await this.upsertInvitedMembership(
      supabase,
      householdId,
      invitedProfile.id,
      input.email,
      input.role,
    );

    await this.sendInvitationMagicLink(input.email);

    return {
      invitationId: invitedMember.id,
      email: input.email,
      status: "invited",
    };
  }

  async updateMember(
    authContext: AuthContext,
    householdId: string,
    memberId: string,
    input: UpdateHouseholdMemberInput,
  ): Promise<HouseholdMemberView> {
    const { supabase, user } = authContext;
    const requesterMembership = await this.requireManagerMembership(supabase, householdId, user.id);
    const targetMembership = await this.getMemberById(supabase, householdId, memberId);

    if (!targetMembership) {
      throw new ServiceError("NOT_FOUND", "Household member was not found");
    }

    if (requesterMembership.role !== "owner" && targetMembership.role === "owner") {
      throw new ServiceError("FORBIDDEN", "Only owners can manage owner memberships");
    }

    const updatePayload: Partial<Pick<HouseholdMemberRow, "role" | "status" | "joined_at">> = {};

    if ("role" in input) {
      if (targetMembership.status !== "active") {
        throw ServiceError.validation("Only active members can have their role updated");
      }

      if (targetMembership.role === "owner") {
        await this.assertCanChangeOwnerMembership(supabase, householdId);
      }

      if (targetMembership.role !== input.role) {
        updatePayload.role = input.role;
      }
    }

    if ("status" in input && input.status === "removed") {
      if (targetMembership.user_id === user.id) {
        throw ServiceError.validation("You cannot remove your own membership");
      }

      if (targetMembership.role === "owner") {
        await this.assertCanChangeOwnerMembership(supabase, householdId);
      }

      if (targetMembership.status !== "removed") {
        updatePayload.status = "removed";
      }
    }

    let latestMemberState = targetMembership;

    if (Object.keys(updatePayload).length > 0) {
      const { data: updatedMembership, error: updatedMembershipError } = await supabase
        .from("household_members")
        .update(updatePayload)
        .eq("id", memberId)
        .eq("household_id", householdId)
        .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
        .single();

      if (updatedMembershipError) {
        throw updatedMembershipError;
      }

      latestMemberState = updatedMembership as HouseholdMemberRow;
    }

    const profiles = await this.getProfilesByUserIds([latestMemberState.user_id]);
    return this.mapMember(latestMemberState, profiles);
  }

  private async requireManagerMembership(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
  ): Promise<HouseholdMemberRow> {
    const membership = await this.requireActiveMembership(supabase, householdId, userId);

    if (!householdManagerRoles.includes(membership.role)) {
      throw new ServiceError("FORBIDDEN", "You are not allowed to manage household members");
    }

    return membership;
  }

  private async requireActiveMembership(
    supabase: SupabaseClient,
    householdId: string,
    userId: string,
  ): Promise<HouseholdMemberRow> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
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

  private async getMemberById(
    supabase: SupabaseClient,
    householdId: string,
    memberId: string,
  ): Promise<HouseholdMemberRow | null> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
      .eq("household_id", householdId)
      .eq("id", memberId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as HouseholdMemberRow | null) ?? null;
  }

  private async upsertInvitedMembership(
    supabase: SupabaseClient,
    householdId: string,
    invitedUserId: string,
    invitedEmail: string,
    role: HouseholdManageableRole,
  ): Promise<HouseholdMemberRow> {
    const { data: existingMembership, error: existingMembershipError } = await supabase
      .from("household_members")
      .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
      .eq("household_id", householdId)
      .eq("user_id", invitedUserId)
      .maybeSingle();

    if (existingMembershipError) {
      throw existingMembershipError;
    }

    const invitedAt = new Date().toISOString();

    if (existingMembership) {
      if (existingMembership.status === "active") {
        throw ServiceError.validation("This user is already an active member of the household");
      }

      const { data: updatedMember, error: updatedMemberError } = await supabase
        .from("household_members")
        .update({
          role,
          status: "invited",
          invited_email: invitedEmail,
          invited_at: invitedAt,
          joined_at: null,
        })
        .eq("id", existingMembership.id)
        .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
        .single();

      if (updatedMemberError) {
        throw updatedMemberError;
      }

      return updatedMember as HouseholdMemberRow;
    }

    const { data: insertedMember, error: insertedMemberError } = await supabase
      .from("household_members")
      .insert({
        household_id: householdId,
        user_id: invitedUserId,
        role,
        status: "invited",
        invited_email: invitedEmail,
        invited_at: invitedAt,
      })
      .select("id, household_id, user_id, role, status, invited_email, invited_at, joined_at")
      .single();

    if (insertedMemberError) {
      throw insertedMemberError;
    }

    return insertedMember as HouseholdMemberRow;
  }

  private async findOrCreateProfileByEmail(email: string): Promise<ProfileRow> {
    const serviceRoleClient = createServiceRoleSupabaseClient();

    const { data: existingProfile, error: existingProfileError } = await serviceRoleClient
      .from("profiles")
      .select("id, email, display_name")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (existingProfile) {
      return existingProfile as ProfileRow;
    }

    const { data: createdUserData, error: createdUserError } = await serviceRoleClient.auth.admin.createUser(
      {
        email,
        email_confirm: true,
      },
    );

    if (createdUserError || !createdUserData.user?.id) {
      throw new ServiceError("INTERNAL_ERROR", "Failed to create invited user account");
    }

    const createdProfile: ProfileRow = {
      id: createdUserData.user.id,
      email,
      display_name: null,
    };

    const { error: upsertProfileError } = await serviceRoleClient.from("profiles").upsert(
      {
        id: createdProfile.id,
        email: createdProfile.email,
        base_currency: "SEK",
        locale: "en",
      },
      { onConflict: "id" },
    );

    if (upsertProfileError) {
      throw upsertProfileError;
    }

    return createdProfile;
  }

  private async sendInvitationMagicLink(email: string): Promise<void> {
    const publicClient = createStatelessSupabaseClient();
    const { error } = await publicClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getMagicLinkRedirectUrl(),
      },
    });

    if (!error) {
      return;
    }

    if (error.status === 429) {
      throw new ServiceError("RATE_LIMITED", "Too many invitation attempts");
    }

    throw new ServiceError("INTERNAL_ERROR", "Failed to send invitation magic link");
  }

  private async getProfilesByUserIds(userIds: string[]): Promise<Map<string, ProfileRow>> {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    const profileMap = new Map<string, ProfileRow>();

    if (uniqueUserIds.length === 0) {
      return profileMap;
    }

    const serviceRoleClient = createServiceRoleSupabaseClient();
    const { data: profiles, error: profilesError } = await serviceRoleClient
      .from("profiles")
      .select("id, email, display_name")
      .in("id", uniqueUserIds);

    if (profilesError) {
      throw profilesError;
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }

    return profileMap;
  }

  private async assertCanChangeOwnerMembership(
    supabase: SupabaseClient,
    householdId: string,
  ): Promise<void> {
    const { data: ownerMemberships, error: ownerMembershipsError } = await supabase
      .from("household_members")
      .select("id")
      .eq("household_id", householdId)
      .eq("status", "active")
      .eq("role", "owner");

    if (ownerMembershipsError) {
      throw ownerMembershipsError;
    }

    if ((ownerMemberships ?? []).length <= 1) {
      throw ServiceError.validation("At least one active owner must remain in the household");
    }
  }

  private mapMember(
    member: HouseholdMemberRow,
    profilesByUserId: Map<string, ProfileRow>,
  ): HouseholdMemberView {
    const profile = profilesByUserId.get(member.user_id);

    return {
      id: member.id,
      userId: member.user_id,
      role: member.role,
      status: member.status,
      displayName: profile?.display_name ?? null,
      email: profile?.email ?? member.invited_email ?? null,
      invitedEmail: member.invited_email,
      joinedAt: member.joined_at,
    };
  }
}

export const householdService = new HouseholdService();
