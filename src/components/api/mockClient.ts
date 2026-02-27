import type {
  ApiEnvelope,
  CreateHouseholdRequest,
  Household,
  HouseholdSummary,
  Invitation,
  InviteHouseholdMemberRequest,
  MagicLinkResponse,
  SessionResponseData,
  SessionUser,
} from "./contracts";

const STORAGE_KEY = "fyrk:sprint1:ui-state";
const API_DELAY_MS = 320;

interface MockState {
  user: SessionUser;
  households: HouseholdSummary[];
  invitations: Record<string, Invitation[]>;
}

const DEFAULT_USER: SessionUser = {
  id: "b53ec1c4-1868-4ec3-8fd7-9f58d327f944",
  email: "",
  displayName: "Fyrk User",
  baseCurrency: "SEK",
  onboardingCompleted: false,
};

const DEFAULT_STATE: MockState = {
  user: DEFAULT_USER,
  households: [],
  invitations: {},
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const createId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) {
    return randomId;
  }

  return `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readState = (): MockState => {
  if (typeof window === "undefined") {
    return clone(DEFAULT_STATE);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return clone(DEFAULT_STATE);
  }

  try {
    const parsed = JSON.parse(raw) as MockState;
    return {
      ...clone(DEFAULT_STATE),
      ...parsed,
      user: {
        ...clone(DEFAULT_USER),
        ...parsed.user,
      },
    };
  } catch {
    return clone(DEFAULT_STATE);
  }
};

const writeState = (state: MockState): void => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const shouldUseFallbackByDefault = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const jsonHeaders = {
  "content-type": "application/json",
};

const requestWithFallback = async <T,>(
  path: string,
  init: RequestInit,
  fallback: () => Promise<T>,
): Promise<T> => {
  if (shouldUseFallbackByDefault() || typeof window === "undefined") {
    return fallback();
  }

  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...jsonHeaders,
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch {
    return fallback();
  }
};

export const sendSignupMagicLink = async (
  email: string,
): Promise<ApiEnvelope<MagicLinkResponse>> =>
  requestWithFallback(
    "/api/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      state.user.email = email;
      state.user.displayName = email.split("@")[0] || "Fyrk User";
      writeState(state);

      return {
        data: {
          message: `Magic link sent to ${email}`,
        },
      };
    },
  );

export const sendLoginMagicLink = async (
  email: string,
): Promise<ApiEnvelope<MagicLinkResponse>> =>
  requestWithFallback(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      state.user.email = email;
      state.user.displayName = email.split("@")[0] || "Fyrk User";
      writeState(state);

      return {
        data: {
          message: "Magic link sent",
        },
      };
    },
  );

export const getSession = async (): Promise<ApiEnvelope<SessionResponseData>> =>
  requestWithFallback(
    "/api/auth/session",
    {
      method: "GET",
    },
    async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      return {
        data: {
          user: state.user,
          households: state.households,
        },
      };
    },
  );

export const createHousehold = async (
  payload: CreateHouseholdRequest,
): Promise<ApiEnvelope<Household>> =>
  requestWithFallback(
    "/api/households",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    async () => {
      await wait(API_DELAY_MS);

      const state = readState();
      const now = new Date().toISOString();
      const householdId = createId();

      const household: Household = {
        id: householdId,
        name: payload.name,
        type: "household",
        baseCurrency: payload.baseCurrency,
        members: [
          {
            userId: state.user.id,
            role: "owner",
            displayName: state.user.displayName,
            status: "active",
          },
        ],
        createdAt: now,
      };

      state.user.baseCurrency = payload.baseCurrency;
      state.households = [
        {
          id: household.id,
          name: household.name,
          role: "owner",
          memberCount: 1,
        },
      ];
      writeState(state);

      return { data: household };
    },
  );

export const inviteHouseholdMember = async (
  householdId: string,
  payload: InviteHouseholdMemberRequest,
): Promise<ApiEnvelope<Invitation>> =>
  requestWithFallback(
    `/api/households/${householdId}/invite`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    async () => {
      await wait(API_DELAY_MS);
      const state = readState();
      const invitation: Invitation = {
        invitationId: createId(),
        email: payload.email,
        status: "invited",
      };

      state.invitations[householdId] = [
        ...(state.invitations[householdId] ?? []),
        invitation,
      ];

      state.households = state.households.map((household) => {
        if (household.id !== householdId) {
          return household;
        }

        return {
          ...household,
          memberCount: household.memberCount + 1,
        };
      });

      writeState(state);
      return { data: invitation };
    },
  );

export const completeOnboarding = async (): Promise<void> => {
  const state = readState();
  state.user.onboardingCompleted = true;
  writeState(state);
  await wait(120);
};

export const signOut = async (): Promise<void> => {
  await requestWithFallback(
    "/api/auth/logout",
    {
      method: "POST",
    },
    async () => {
      await wait(120);
      writeState(clone(DEFAULT_STATE));
    },
  );
};
