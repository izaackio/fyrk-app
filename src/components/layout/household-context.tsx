"use client";

import { createContext, useContext } from "react";

import type {
  DemoInitialization,
  DemoVariant,
  HouseholdSummary,
  SessionDemoContext,
  SessionResponseData,
} from "../api/contracts";

export type OnboardingState = "not_started" | "demo_ready" | "complete";

export interface HouseholdContextValue {
  activeHousehold: HouseholdSummary | null;
  activeHouseholdId: string | null;
  density: "narrative" | "terminal";
  demoContext: SessionDemoContext | null;
  demoError: string | null;
  demoLoading: boolean;
  error: string | null;
  hasRealHouseholds: boolean;
  households: HouseholdSummary[];
  loading: boolean;
  onboardingState: OnboardingState;
  realHouseholds: HouseholdSummary[];
  refreshSession: (preferredHouseholdId?: string | null) => Promise<void>;
  selectHousehold: (householdId: string) => void;
  setDensity: (density: "narrative" | "terminal") => void;
  setTheme: (theme: "light" | "dark") => void;
  session: SessionResponseData | null;
  sessionError: string | null;
  startDemo: (variant: DemoVariant) => Promise<DemoInitialization>;
  theme: "light" | "dark";
}

export const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function useHouseholdContext(): HouseholdContextValue {
  const context = useContext(HouseholdContext);

  if (!context) {
    throw new Error("useHouseholdContext must be used within the app shell");
  }

  return context;
}
