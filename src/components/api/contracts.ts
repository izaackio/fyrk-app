export type HouseholdRole = "owner" | "admin" | "member";

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
}

export interface SessionResponseData {
  user: SessionUser;
  households: HouseholdSummary[];
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
