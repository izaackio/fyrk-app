import type { ApiEnvelope } from "../accounts/contracts";
import {
  createTimelineEntryFallback,
  deleteTimelineEntryFallback,
  listTimelineEntriesFallback,
  updateTimelineEntryFallback,
} from "../sprint4/fallback";
import { requestWithFallback } from "../sprint4/http";
import type {
  CreateTimelineEntryRequest,
  TimelineActor,
  TimelineEntry,
  TimelineFilters,
  UpdateTimelineEntryRequest,
} from "../sprint4/contracts";

const toSearchParams = (householdId: string, filters: TimelineFilters): string => {
  const params = new URLSearchParams({ householdId });

  if (filters.types && filters.types.length > 0) {
    params.set("types", filters.types.join(","));
  }

  if (filters.categories && filters.categories.length > 0) {
    params.set("categories", filters.categories.join(","));
  }

  if (filters.from) {
    params.set("from", filters.from);
  }

  if (filters.to) {
    params.set("to", filters.to);
  }

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  return params.toString();
};

export const listTimelineEntries = async ({
  actor,
  filters,
  householdId,
}: {
  actor?: TimelineActor | null;
  filters: TimelineFilters;
  householdId: string;
}): Promise<ApiEnvelope<TimelineEntry[]>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await listTimelineEntriesFallback({
        ...(actor !== undefined ? { actor } : {}),
        filters,
        householdId,
      }),
    }),
    init: {
      method: "GET",
    },
    path: `/api/timeline?${toSearchParams(householdId, filters)}`,
  });

export const createTimelineEntry = async (
  payload: CreateTimelineEntryRequest,
): Promise<ApiEnvelope<TimelineEntry>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await createTimelineEntryFallback({
        actor: payload.createdBy,
        category: payload.category,
        description: payload.description,
        entryDate: payload.entryDate,
        entryType: payload.entryType,
        householdId: payload.householdId,
        title: payload.title,
      }),
    }),
    init: {
      body: JSON.stringify(payload),
      method: "POST",
    },
    path: "/api/timeline",
  });

export const updateTimelineEntry = async ({
  actor,
  householdId,
  id,
  payload,
}: {
  actor?: TimelineActor | null;
  householdId: string;
  id: string;
  payload: UpdateTimelineEntryRequest;
}): Promise<ApiEnvelope<TimelineEntry>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await updateTimelineEntryFallback({
        ...(actor !== undefined ? { actor } : {}),
        householdId,
        id,
        payload,
      }),
    }),
    init: {
      body: JSON.stringify({ householdId, ...payload }),
      method: "PATCH",
    },
    path: `/api/timeline/${encodeURIComponent(id)}`,
  });

export const deleteTimelineEntry = async ({
  actor,
  householdId,
  id,
}: {
  actor?: TimelineActor | null;
  householdId: string;
  id: string;
}): Promise<void> => {
  await requestWithFallback({
    fallback: async () => {
      await deleteTimelineEntryFallback({
        ...(actor !== undefined ? { actor } : {}),
        householdId,
        id,
      });

      return { data: { success: true } };
    },
    init: {
      body: JSON.stringify({ householdId }),
      method: "DELETE",
    },
    path: `/api/timeline/${encodeURIComponent(id)}`,
  });
};
