import type { ApiEnvelope } from "../accounts/contracts";
import {
  getLifeEventFallback,
  listEventLibraryFallback,
  listLifeEventsFallback,
  triggerLifeEventFallback,
  updatePlaybookActionFallback,
} from "../sprint4/fallback";
import { requestWithFallback } from "../sprint4/http";
import type {
  EventLibraryItem,
  LifeEvent,
  TimelineActor,
  TriggerLifeEventRequest,
  UpdatePlaybookActionRequest,
} from "../sprint4/contracts";

export const listEventLibrary = async (): Promise<ApiEnvelope<EventLibraryItem[]>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await listEventLibraryFallback(),
    }),
    init: {
      method: "GET",
    },
    path: "/api/events/library",
  });

export const listLifeEvents = async ({
  actor,
  householdId,
}: {
  actor?: TimelineActor | null;
  householdId: string;
}): Promise<ApiEnvelope<LifeEvent[]>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await listLifeEventsFallback({
        ...(actor !== undefined ? { actor } : {}),
        householdId,
      }),
    }),
    init: {
      method: "GET",
    },
    path: `/api/events?householdId=${encodeURIComponent(householdId)}`,
  });

export const getLifeEvent = async ({
  actor,
  householdId,
  id,
}: {
  actor?: TimelineActor | null;
  householdId: string;
  id: string;
}): Promise<ApiEnvelope<LifeEvent>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await getLifeEventFallback({
        ...(actor !== undefined ? { actor } : {}),
        householdId,
        id,
      }),
    }),
    init: {
      method: "GET",
    },
    path: `/api/events/${encodeURIComponent(id)}?householdId=${encodeURIComponent(householdId)}`,
  });

export const triggerLifeEvent = async ({
  actor,
  payload,
}: {
  actor: TimelineActor;
  payload: TriggerLifeEventRequest;
}): Promise<ApiEnvelope<LifeEvent>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await triggerLifeEventFallback({
        actor,
        payload,
      }),
    }),
    init: {
      body: JSON.stringify(payload),
      method: "POST",
    },
    path: "/api/events",
  });

export const updatePlaybookAction = async ({
  actionId,
  actor,
  eventId,
  householdId,
  payload,
}: {
  actionId: string;
  actor?: TimelineActor | null;
  eventId: string;
  householdId: string;
  payload: UpdatePlaybookActionRequest;
}): Promise<ApiEnvelope<LifeEvent>> =>
  requestWithFallback({
    fallback: async () => ({
      data: await updatePlaybookActionFallback({
        actionId,
        ...(actor !== undefined ? { actor } : {}),
        eventId,
        householdId,
        payload,
      }),
    }),
    init: {
      body: JSON.stringify({ householdId, ...payload }),
      method: "PATCH",
    },
    path: `/api/events/${encodeURIComponent(eventId)}/actions/${encodeURIComponent(actionId)}`,
  });
