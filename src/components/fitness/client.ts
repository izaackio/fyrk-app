import type { ApiEnvelope } from "../accounts/contracts";
import { loadFitnessFallback } from "../sprint4/fallback";
import { requestWithFallback } from "../sprint4/http";
import type { FitnessPayload, TimelineActor } from "../sprint4/contracts";

export const loadFitness = async ({
  actor,
  householdId,
}: {
  actor?: TimelineActor | null;
  householdId: string;
}): Promise<ApiEnvelope<FitnessPayload>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await loadFitnessFallback({
        ...(actor !== undefined ? { actor } : {}),
        householdId,
      }),
    }),
    init: {
      method: "GET",
    },
    path: `/api/fitness?householdId=${encodeURIComponent(householdId)}`,
  });
