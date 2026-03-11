import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthContext } from "@/lib/auth/middleware";
import { createServiceRoleSupabaseClient } from "@/lib/auth/supabase";
import type { DemoVariant } from "@/lib/demo";
import { ServiceError } from "@/services/errors";

interface DemoHouseholdRow {
  id: string;
  name: string;
  demo_variant: DemoVariant;
  created_at: string;
}

interface HouseholdMembershipRow {
  id: string;
  household_id: string;
  status: string;
}

interface DemoMemberProfileRow {
  id: string;
  is_demo_user: boolean;
}

export interface DemoInitializationView {
  id: string;
  name: string;
  isDemo: true;
  demoVariant: DemoVariant;
  memberCount: number;
  accountCount: number;
  timelineEntries: number;
}

export class DemoService {
  constructor(
    private readonly createServiceRoleClient: () => SupabaseClient = createServiceRoleSupabaseClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async initialize(authContext: AuthContext, variant: DemoVariant): Promise<DemoInitializationView> {
    const supabase = this.createServiceRoleClient();
    const demoHousehold = await this.findDemoHousehold(supabase, variant);

    if (!demoHousehold) {
      throw new ServiceError("NOT_FOUND", "Demo household was not found");
    }

    const demoHouseholdIds = await this.listDemoHouseholdIds(supabase);
    await this.deactivateOtherDemoMemberships(
      supabase,
      authContext.user.id,
      demoHouseholdIds.filter((householdId) => householdId !== demoHousehold.id),
    );
    await this.activateDemoMembership(supabase, authContext.user.id, demoHousehold.id);

    const summary = await this.buildDemoSummary(supabase, demoHousehold.id);

    return {
      id: demoHousehold.id,
      name: demoHousehold.name,
      isDemo: true,
      demoVariant: variant,
      memberCount: summary.memberCount,
      accountCount: summary.accountCount,
      timelineEntries: summary.timelineEntries,
    };
  }

  private async findDemoHousehold(
    supabase: SupabaseClient,
    variant: DemoVariant,
  ): Promise<DemoHouseholdRow | null> {
    const { data, error } = await supabase
      .from("households")
      .select("id, name, demo_variant, created_at")
      .eq("is_demo", true)
      .eq("demo_variant", variant)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as DemoHouseholdRow[];
    return rows[0] ?? null;
  }

  private async listDemoHouseholdIds(supabase: SupabaseClient): Promise<string[]> {
    const { data, error } = await supabase
      .from("households")
      .select("id")
      .eq("is_demo", true)
      .is("deleted_at", null);

    if (error) {
      throw error;
    }

    return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
  }

  private async deactivateOtherDemoMemberships(
    supabase: SupabaseClient,
    userId: string,
    householdIds: string[],
  ): Promise<void> {
    if (householdIds.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("household_members")
      .update({
        status: "removed",
        updated_at: this.now().toISOString(),
      })
      .eq("user_id", userId)
      .in("household_id", householdIds)
      .neq("status", "removed");

    if (error) {
      throw error;
    }
  }

  private async activateDemoMembership(
    supabase: SupabaseClient,
    userId: string,
    householdId: string,
  ): Promise<void> {
    const { data, error } = await supabase
      .from("household_members")
      .select("id, household_id, status")
      .eq("user_id", userId)
      .eq("household_id", householdId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const nowIso = this.now().toISOString();
    const existingMembership = (data as HouseholdMembershipRow | null) ?? null;

    if (existingMembership) {
      const { error: updateError } = await supabase
        .from("household_members")
        .update({
          role: "member",
          status: "active",
          joined_at: nowIso,
          invited_at: null,
          invited_email: null,
          updated_at: nowIso,
        })
        .eq("id", existingMembership.id);

      if (updateError) {
        throw updateError;
      }

      return;
    }

    const { error: insertError } = await supabase.from("household_members").insert({
      household_id: householdId,
      user_id: userId,
      role: "member",
      status: "active",
      joined_at: nowIso,
    });

    if (insertError) {
      throw insertError;
    }
  }

  private async buildDemoSummary(
    supabase: SupabaseClient,
    householdId: string,
  ): Promise<{ accountCount: number; memberCount: number; timelineEntries: number }> {
    const { data: membershipRows, error: membershipError } = await supabase
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .eq("status", "active");

    if (membershipError) {
      throw membershipError;
    }

    const memberIds = ((membershipRows ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
    let memberCount = 0;

    if (memberIds.length > 0) {
      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, is_demo_user")
        .in("id", memberIds);

      if (profileError) {
        throw profileError;
      }

      memberCount = ((profileRows ?? []) as DemoMemberProfileRow[]).filter(
        (row) => row.is_demo_user,
      ).length;
    }

    const accountCount = await this.countRows(supabase, "accounts", [
      ["household_id", householdId],
      ["is_active", true],
    ]);
    const timelineEntries = await this.countRows(supabase, "timeline_entries", [["household_id", householdId]]);

    return {
      accountCount,
      memberCount,
      timelineEntries,
    };
  }

  private async countRows(
    supabase: SupabaseClient,
    table: "accounts" | "timeline_entries",
    filters: Array<[field: string, value: unknown]>,
  ): Promise<number> {
    let request = supabase.from(table).select("id", { count: "exact", head: true }).is("deleted_at", null);

    for (const [field, value] of filters) {
      request = request.eq(field, value);
    }

    const { count, error } = await request;

    if (error) {
      throw error;
    }

    return count ?? 0;
  }
}

export const demoService = new DemoService();
