import type { AuthContext } from "@/lib/auth/middleware";
import { createStatelessSupabaseClient, getMagicLinkRedirectUrl } from "@/lib/auth/supabase";
import { ServiceError } from "@/services/errors";
import type { HouseholdRole, SessionHouseholdSummary, SessionUser } from "@/types/domain";

interface SessionHouseholdMembershipRow {
  household_id: string;
  role: HouseholdRole;
  households: { id: string; name: string } | Array<{ id: string; name: string }> | null;
}

interface HouseholdMemberCountRow {
  household_id: string;
}

export interface AuthSessionPayload {
  user: SessionUser;
  households: SessionHouseholdSummary[];
}

export class AuthService {
  async signup(email: string): Promise<{ message: string }> {
    await this.sendMagicLink(email, true);
    return { message: `Magic link sent to ${email}` };
  }

  async login(email: string): Promise<{ message: string }> {
    await this.sendMagicLink(email, false);
    return { message: "Magic link sent" };
  }

  async getSession(authContext: AuthContext): Promise<AuthSessionPayload> {
    const { supabase, user, profile } = authContext;

    const { data: memberships, error: membershipsError } = await supabase
      .from("household_members")
      .select("household_id, role, households!inner(id, name)")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (membershipsError) {
      throw membershipsError;
    }

    const typedMemberships = (memberships ?? []) as SessionHouseholdMembershipRow[];
    const householdIds = typedMemberships.map((item) => item.household_id);
    const memberCountByHousehold = new Map<string, number>();

    if (householdIds.length > 0) {
      const { data: memberRows, error: memberRowsError } = await supabase
        .from("household_members")
        .select("household_id")
        .in("household_id", householdIds)
        .eq("status", "active");

      if (memberRowsError) {
        throw memberRowsError;
      }

      for (const row of (memberRows ?? []) as HouseholdMemberCountRow[]) {
        const previous = memberCountByHousehold.get(row.household_id) ?? 0;
        memberCountByHousehold.set(row.household_id, previous + 1);
      }
    }

    return {
      user: {
        id: user.id,
        email: profile.email,
        displayName: profile.display_name,
        baseCurrency: profile.base_currency,
        onboardingCompleted: profile.onboarding_completed,
      },
      households: typedMemberships
        .map((item) => {
          const household = this.resolveHouseholdJoin(item.households);

          if (!household) {
            return null;
          }

          return {
            id: household.id,
            name: household.name,
            role: item.role,
            memberCount: memberCountByHousehold.get(item.household_id) ?? 0,
          } satisfies SessionHouseholdSummary;
        })
        .filter((item): item is SessionHouseholdSummary => item !== null),
    };
  }

  async logout(authContext: AuthContext): Promise<void> {
    const { error } = await authContext.supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }

  private async sendMagicLink(email: string, shouldCreateUser: boolean): Promise<void> {
    const supabase = createStatelessSupabaseClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser,
        emailRedirectTo: getMagicLinkRedirectUrl(),
      },
    });

    if (!error) {
      return;
    }

    if (!shouldCreateUser) {
      const message = error.message.toLowerCase();
      if (message.includes("user not found") || message.includes("email not confirmed")) {
        return;
      }
    }

    this.throwMagicLinkError(error);
  }

  private throwMagicLinkError(error: { message: string; status?: number | undefined }): never {
    if (error.status === 429) {
      throw new ServiceError("RATE_LIMITED", "Too many magic link requests");
    }

    throw new ServiceError("INTERNAL_ERROR", "Unable to send magic link");
  }

  private resolveHouseholdJoin(
    value: SessionHouseholdMembershipRow["households"],
  ): { id: string; name: string } | null {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      return value[0] ?? null;
    }

    return value;
  }
}

export const authService = new AuthService();
