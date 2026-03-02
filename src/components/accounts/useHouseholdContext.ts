"use client";

import { useEffect, useMemo, useState } from "react";

import type { SessionResponseData } from "../api/contracts";
import { getSession } from "../api/mockClient";

interface UseHouseholdContextResult {
  activeHouseholdId: string | null;
  error: string | null;
  loading: boolean;
  session: SessionResponseData | null;
}

export function useHouseholdContext(): UseHouseholdContextResult {
  const [session, setSession] = useState<SessionResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getSession()
      .then((response) => {
        if (cancelled) {
          return;
        }

        setSession(response.data);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError("We could not load your household context.");
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeHouseholdId = useMemo(
    () => session?.households[0]?.id ?? null,
    [session],
  );

  return {
    activeHouseholdId,
    error,
    loading,
    session,
  };
}
