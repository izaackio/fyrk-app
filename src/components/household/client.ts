"use client";

import type { ApiEnvelope, HouseholdRole, Invitation } from "../api/contracts";

export interface HouseholdWorkspaceMember {
  displayName: string;
  email: string | null;
  id: string;
  joinedAt: string | null;
  role: HouseholdRole;
  status: "active" | "invited";
}

export interface HouseholdWorkspaceData {
  baseCurrency: string;
  createdAt: string | null;
  id: string;
  members: HouseholdWorkspaceMember[];
  name: string;
}

interface MockState {
  demoContext: {
    householdId: string;
  } | null;
  households: Array<{
    id: string;
    isDemo?: boolean;
    name: string;
  }>;
  invitations: Record<string, Invitation[]>;
  user: {
    baseCurrency: string;
    displayName: string;
    email: string;
    id: string;
  };
}

interface ServerHouseholdMember {
  displayName: string | null;
  email: string | null;
  id: string;
  invitedEmail: string | null;
  joinedAt: string | null;
  role: HouseholdRole;
  status: "active" | "invited" | "removed";
}

interface ServerHouseholdResponse {
  baseCurrency: string;
  createdAt: string;
  id: string;
  members: ServerHouseholdMember[];
  name: string;
}

const STORAGE_KEY = "fyrk:sprint1:ui-state";

const shouldUseFallbackByDefault = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const readMockState = (): MockState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MockState;
  } catch {
    return null;
  }
};

const formatFallbackName = (email: string, index: number): string => {
  const localPart = email.split("@")[0]?.trim();
  if (localPart) {
    return localPart
      .split(/[._-]+/u)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  return `Household member ${index + 1}`;
};

const mapServerResponse = (payload: ServerHouseholdResponse): HouseholdWorkspaceData => ({
  baseCurrency: payload.baseCurrency,
  createdAt: payload.createdAt,
  id: payload.id,
  members: payload.members
    .filter((member) => member.status !== "removed")
    .map((member, index) => ({
      displayName:
        member.displayName ??
        member.email ??
        member.invitedEmail ??
        `Household member ${index + 1}`,
      email: member.email ?? member.invitedEmail ?? null,
      id: member.id,
      joinedAt: member.joinedAt,
      role: member.role,
      status: member.status === "invited" ? "invited" : "active",
    })),
  name: payload.name,
});

const loadFallbackHousehold = (householdId: string): HouseholdWorkspaceData => {
  const state = readMockState();
  const household = state?.households.find((entry) => entry.id === householdId) ?? null;

  return {
    baseCurrency: state?.user.baseCurrency ?? "SEK",
    createdAt: null,
    id: householdId,
    members: [
      {
        displayName: state?.user.displayName || state?.user.email || "Household owner",
        email: state?.user.email ?? null,
        id: state?.user.id ?? "mock-owner",
        joinedAt: null,
        role: "owner",
        status: "active",
      },
      ...((state?.invitations[householdId] ?? []).map((invitation, index) => ({
        displayName: formatFallbackName(invitation.email, index),
        email: invitation.email,
        id: invitation.invitationId,
        joinedAt: null,
        role: "member" as const,
        status: "invited" as const,
      })) ?? []),
    ],
    name: household?.name ?? "Your household",
  };
};

export async function loadHouseholdWorkspace(
  householdId: string,
): Promise<ApiEnvelope<HouseholdWorkspaceData>> {
  if (shouldUseFallbackByDefault() || typeof window === "undefined") {
    return { data: loadFallbackHousehold(householdId) };
  }

  try {
    const response = await fetch(`/api/households/${householdId}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = (await response.json()) as ApiEnvelope<ServerHouseholdResponse>;
    return {
      data: mapServerResponse(payload.data),
    };
  } catch {
    return { data: loadFallbackHousehold(householdId) };
  }
}
