import type { SupabaseClient } from "@supabase/supabase-js";

import { ServiceError } from "@/services/errors";

export const demoVariants = ["standard", "fire", "fam_family", "friendly_family"] as const;
export type DemoVariant = (typeof demoVariants)[number];

export const DEMO_CONTEXT_COOKIE = "fyrk_demo_context";
export const DEMO_CONTEXT_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;

export interface DemoContext {
  householdId: string;
  householdName: string;
  variant: DemoVariant;
  readOnly: true;
}

interface DemoHouseholdRow {
  id: string;
  name: string;
  is_demo: boolean;
  demo_variant: DemoVariant | null;
  deleted_at: string | null;
}

interface DemoMembershipRow {
  status: string;
  households: DemoHouseholdRow | DemoHouseholdRow[] | null;
}

interface DemoCookiePayload {
  householdId: string;
  variant: DemoVariant;
}

function resolveJoinedHousehold<T>(value: T | T[] | null): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export function buildDemoContextCookieValue(input: DemoCookiePayload): string {
  return `${input.householdId}:${input.variant}`;
}

export function parseDemoContextCookie(rawValue: string | undefined): DemoCookiePayload | null {
  if (!rawValue) {
    return null;
  }

  const [householdId, variant] = rawValue.split(":");

  if (
    !householdId ||
    !variant ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      householdId,
    ) ||
    !(demoVariants as readonly string[]).includes(variant)
  ) {
    return null;
  }

  return {
    householdId,
    variant: variant as DemoVariant,
  };
}

export function getDemoContextCookieOptions(): {
  httpOnly: true;
  maxAge: number;
  path: string;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    httpOnly: true,
    maxAge: DEMO_CONTEXT_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export async function resolveDemoContext(
  supabase: SupabaseClient,
  userId: string,
  cookieValue: string | undefined,
): Promise<DemoContext | null> {
  const parsed = parseDemoContextCookie(cookieValue);
  if (!parsed) {
    return null;
  }

  const { data, error } = await supabase
    .from("household_members")
    .select("status, households!inner(id, name, is_demo, demo_variant, deleted_at)")
    .eq("household_id", parsed.householdId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const membership = (data as DemoMembershipRow | null) ?? null;
  const household = resolveJoinedHousehold(membership?.households ?? null);

  if (
    !membership ||
    membership.status !== "active" ||
    !household ||
    !household.is_demo ||
    household.deleted_at ||
    household.demo_variant !== parsed.variant
  ) {
    return null;
  }

  return {
    householdId: household.id,
    householdName: household.name,
    variant: parsed.variant,
    readOnly: true,
  };
}

export function isActiveDemoContext(
  authLike: { demoContext?: DemoContext | null },
  householdId: string,
): boolean {
  return authLike.demoContext?.householdId === householdId;
}

export async function isDemoHousehold(
  supabase: SupabaseClient,
  householdId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("households")
    .select("id")
    .eq("id", householdId)
    .eq("is_demo", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function assertHouseholdWritable(
  supabase: SupabaseClient,
  householdId: string,
  message = "Demo households are read-only",
): Promise<void> {
  if (await isDemoHousehold(supabase, householdId)) {
    throw new ServiceError("FORBIDDEN", message, {
      demo: true,
      householdId,
    });
  }
}
