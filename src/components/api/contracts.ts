export type HouseholdRole = "owner" | "admin" | "member" | "viewer";
export type DemoVariant = "standard" | "fire" | "fam_family" | "friendly_family";

export interface SessionDemoContext {
  householdId: string;
  householdName: string;
  variant: DemoVariant;
  readOnly: true;
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface MagicLinkResponse {
  message: string;
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  baseCurrency: string;
  onboardingCompleted: boolean;
}

export interface HouseholdSummary {
  id: string;
  name: string;
  role: HouseholdRole;
  memberCount: number;
  isDemo?: boolean;
  demoVariant?: DemoVariant | null;
}

export interface SessionResponseData {
  user: SessionUser;
  households: HouseholdSummary[];
  demoContext: SessionDemoContext | null;
}

export interface CreateHouseholdRequest {
  name: string;
  baseCurrency: string;
}

export interface HouseholdMember {
  userId: string;
  role: HouseholdRole;
  displayName: string;
  status: "active" | "invited";
}

export interface Household {
  id: string;
  name: string;
  type: "household";
  baseCurrency: string;
  members: HouseholdMember[];
  createdAt: string;
}

export interface InviteHouseholdMemberRequest {
  email: string;
  role: Exclude<HouseholdRole, "owner">;
}

export interface Invitation {
  invitationId: string;
  email: string;
  status: "invited";
}

export interface DemoInitialization {
  id: string;
  name: string;
  isDemo: true;
  demoVariant: DemoVariant;
  memberCount: number;
  accountCount: number;
  timelineEntries: number;
}
