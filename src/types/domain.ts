export const householdRoles = ["owner", "admin", "member", "viewer"] as const;
export type HouseholdRole = (typeof householdRoles)[number];

export const householdManageableRoles = ["admin", "member", "viewer"] as const;
export type HouseholdManageableRole = (typeof householdManageableRoles)[number];

export const householdMemberStatuses = ["active", "invited", "removed"] as const;
export type HouseholdMemberStatus = (typeof householdMemberStatuses)[number];

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  baseCurrency: string;
  onboardingCompleted: boolean;
}

export interface SessionHouseholdSummary {
  id: string;
  name: string;
  role: HouseholdRole;
  memberCount: number;
}

export interface HouseholdMemberView {
  id: string;
  userId: string;
  role: HouseholdRole;
  status: HouseholdMemberStatus;
  displayName: string | null;
  email: string | null;
  invitedEmail: string | null;
  joinedAt: string | null;
}

export interface HouseholdView {
  id: string;
  name: string;
  type: string;
  baseCurrency: string;
  members: HouseholdMemberView[];
  createdAt: string;
}
