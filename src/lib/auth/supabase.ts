import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { ServiceError } from "@/services/errors";

function getEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ServiceError("INTERNAL_ERROR", `Missing required environment variable: ${name}`);
  }

  return value;
}

function getPublicSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getMagicLinkRedirectUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/auth/callback`;
}

export async function createRouteSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options as CookieOptions);
        }
      },
    },
  });
}

export function createStatelessSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getPublicSupabaseConfig();

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createServiceRoleSupabaseClient(): SupabaseClient {
  const { url } = getPublicSupabaseConfig();
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
