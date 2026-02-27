import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

import { createRouteSupabaseClient } from "@/lib/auth/supabase";
import { ServiceError } from "@/services/errors";
import type { HouseholdMemberStatus, HouseholdRole } from "@/types/domain";

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  base_currency: string;
  onboarding_completed: boolean;
}

interface HouseholdMembershipRow {
  id: string;
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
}

export interface AuthContext {
  supabase: SupabaseClient;
  session: Session;
  user: User;
  profile: ProfileRow;
}

export interface HouseholdAccessContext extends AuthContext {
  membership: HouseholdMembershipRow;
}

async function ensureProfile(supabase: SupabaseClient, user: User): Promise<ProfileRow> {
  if (!user.email) {
    throw new ServiceError("INTERNAL_ERROR", "Session user is missing an email address");
  }

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      base_currency: "SEK",
      locale: "en",
    },
    { onConflict: "id" },
  );

  if (upsertError) {
    throw upsertError;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, base_currency, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  return data as ProfileRow;
}

export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new ServiceError("AUTH_REQUIRED", "A valid session is required");
  }

  const profile = await ensureProfile(supabase, session.user);
  return { supabase, session, user: session.user, profile };
}

export async function requireHouseholdAccess(householdId: string): Promise<HouseholdAccessContext> {
  const authContext = await requireAuth();

  const { data, error } = await authContext.supabase
    .from("household_members")
    .select("id, household_id, user_id, role, status")
    .eq("household_id", householdId)
    .eq("user_id", authContext.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.status !== "active") {
    throw new ServiceError("FORBIDDEN", "You are not a member of this household");
  }

  return {
    ...authContext,
    membership: data as HouseholdMembershipRow,
  };
}
