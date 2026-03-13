"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { DEMO_VARIANT_LABELS } from "../api/demo-options";
import { getSession, initializeDemoHousehold } from "../api/mockClient";
import type { DemoVariant, HouseholdSummary, SessionResponseData } from "../api/contracts";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { AppIcon, FyrkMark } from "./icons";
import {
  MOBILE_NAV_ITEMS,
  NAV_SECTIONS,
  PREVIEW_NAV_SECTION,
  getPageMeta,
  isActivePath,
} from "./navigation";
import {
  HouseholdContext,
  type OnboardingState,
} from "./household-context";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";

import styles from "./shell.module.css";

const THEME_STORAGE_KEY = "fyrk:shell:theme";
const DENSITY_STORAGE_KEY = "fyrk:shell:density";
const ACTIVE_HOUSEHOLD_STORAGE_KEY = "fyrk:shell:active-household";

interface AppShellProps {
  children: ReactNode;
}

const getRoleLabel = (role: HouseholdSummary["role"]): string => {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Member";
    default:
      return "Viewer";
  }
};

const describeSessionError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load your app session. Try again in a moment.";
};

const deriveOnboardingState = (session: SessionResponseData | null): OnboardingState => {
  if (!session) {
    return "not_started";
  }

  if (session.households.some((household) => !household.isDemo)) {
    return "complete";
  }

  if (session.demoContext) {
    return "demo_ready";
  }

  if (session.user.onboardingCompleted) {
    return "complete";
  }

  return "not_started";
};

const resolvePreferredHouseholdId = (
  session: SessionResponseData,
  currentHouseholdId: string | null,
  preferredHouseholdId?: string | null,
): string | null => {
  const storedHouseholdId =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem(ACTIVE_HOUSEHOLD_STORAGE_KEY);
  const nextRealHousehold = session.households.find((household) => !household.isDemo)?.id ?? null;
  const candidates = [
    preferredHouseholdId ?? null,
    currentHouseholdId,
    storedHouseholdId,
    session.demoContext?.householdId ?? null,
    nextRealHousehold,
    session.households[0]?.id ?? null,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (session.households.some((household) => household.id === candidate)) {
      return candidate;
    }
  }

  return null;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" ? "dark" : "light";
  });
  const [density, setDensity] = useState<"narrative" | "terminal">(() => {
    if (typeof window === "undefined") {
      return "narrative";
    }

    const savedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return savedDensity === "terminal" ? "terminal" : "narrative";
  });
  const [session, setSession] = useState<SessionResponseData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(ACTIVE_HOUSEHOLD_STORAGE_KEY);
  });
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    if (!activeHouseholdId) {
      window.localStorage.removeItem(ACTIVE_HOUSEHOLD_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ACTIVE_HOUSEHOLD_STORAGE_KEY, activeHouseholdId);
  }, [activeHouseholdId]);

  const loadSession = async (preferredHouseholdId?: string | null): Promise<void> => {
    try {
      setSessionLoading(true);
      setSessionError(null);

      const response = await getSession();
      setSession(response.data);
      setActiveHouseholdId((currentHouseholdId) =>
        resolvePreferredHouseholdId(response.data, currentHouseholdId, preferredHouseholdId),
      );
    } catch (error) {
      setSessionError(describeSessionError(error));
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setSessionLoading(true);
        setSessionError(null);

        const response = await getSession();
        if (cancelled) {
          return;
        }

        setSession(response.data);
        setActiveHouseholdId((currentHouseholdId) =>
          resolvePreferredHouseholdId(response.data, currentHouseholdId),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionError(describeSessionError(error));
      } finally {
        if (cancelled) {
          return;
        }

        setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const households = session?.households ?? [];
  const realHouseholds = households.filter((household) => !household.isDemo);
  const activeHousehold =
    households.find((household) => household.id === activeHouseholdId) ?? households[0] ?? null;
  const onboardingState = deriveOnboardingState(session);
  const page = useMemo(() => getPageMeta(pathname), [pathname]);
  const needsOnboarding = onboardingState === "not_started";
  const activeDemoVariant =
    activeHousehold?.isDemo && activeHousehold.demoVariant ? activeHousehold.demoVariant : null;
  const householdHeadline = activeHousehold
    ? activeHousehold.name
    : needsOnboarding
      ? "Finish household setup"
      : "Create your household";
  const householdMeta = activeDemoVariant
    ? `${DEMO_VARIANT_LABELS[activeDemoVariant]} · read-only demo`
    : activeHousehold
      ? `${activeHousehold.memberCount} member${activeHousehold.memberCount === 1 ? "" : "s"} · ${getRoleLabel(activeHousehold.role)}`
      : "Shared context appears here once the household is active.";

  const startDemo = async (variant: DemoVariant) => {
    setDemoLoading(true);
    setDemoError(null);

    try {
      const response = await initializeDemoHousehold(variant);
      await loadSession(response.data.id);
      return response.data;
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We could not activate the demo right now.";
      setDemoError(message);
      throw error;
    } finally {
      setDemoLoading(false);
    }
  };

  const sessionContextValue = {
    activeHousehold,
    activeHouseholdId,
    density,
    demoContext: session?.demoContext ?? null,
    demoError,
    demoLoading,
    error: sessionError,
    hasRealHouseholds: realHouseholds.length > 0,
    households,
    loading: sessionLoading,
    onboardingState,
    realHouseholds,
    refreshSession: loadSession,
    selectHousehold: (householdId: string) => {
      setDemoError(null);
      setActiveHouseholdId(householdId);
    },
    setDensity,
    setTheme,
    session,
    sessionError,
    startDemo,
    theme,
  };

  return (
    <HouseholdContext.Provider value={sessionContextValue}>
      <div
        className={[themeStyles.themeRoot, styles.shellRoot].join(" ")}
        data-density={density}
        data-theme={theme}
      >
        <div aria-hidden className={styles.shellBackdrop} />

        <div className={styles.shellLayout}>
          <aside className={styles.rail}>
            <div className={styles.railBrand}>
              <div className={styles.railBrandRow}>
                <FyrkMark className={styles.railMark} />
                <div className={styles.railBrandCopy}>
                  <span className={styles.railWordmark}>Fyrk</span>
                  <span className={styles.railTagline}>Household Finance OS</span>
                </div>
              </div>
              <p className={styles.railNarrative}>
                Start with the household brief, validate it in the balance sheet, and move
                deeper only when the numbers call for it.
              </p>
            </div>

            <div className={styles.railPrinciples}>
              <span className={styles.railEyebrow}>Operating rhythm</span>
              <h2 className={styles.railCardTitle}>Home and Balance Sheet are the daily anchors.</h2>
              <p className={styles.railCardText}>
                Narrative mode keeps interpretation close to the numbers. CFO mode compresses
                the same shell for faster scanning and review.
              </p>
            </div>

            <SidebarNav sections={NAV_SECTIONS} />

            <div className={styles.previewPanel}>
              <SidebarNav sections={[PREVIEW_NAV_SECTION]} />
            </div>

            <div className={styles.railContext}>
              <span className={styles.railEyebrow}>Active household</span>
              <h2 className={styles.railCardTitle}>{householdHeadline}</h2>
              <p className={styles.railContextMeta}>{householdMeta}</p>
            </div>
          </aside>

          {drawerOpen ? (
            <>
              <button
                aria-label="Close navigation menu"
                className={styles.overlay}
                onClick={() => setDrawerOpen(false)}
                type="button"
              />
              <aside className={styles.drawer}>
                <div className={styles.drawerTop}>
                  <div className={styles.railBrandRow}>
                    <FyrkMark className={styles.railMark} />
                    <div className={styles.railBrandCopy}>
                      <span className={styles.railWordmark}>Fyrk</span>
                      <span className={styles.railTagline}>Household Finance OS</span>
                    </div>
                  </div>
                  <p className={styles.railCardText}>
                    The mobile shell keeps the same IA: brief first, ledger second, planning
                    third, previews clearly separated.
                  </p>
                </div>
                <SidebarNav
                  sections={[...NAV_SECTIONS, PREVIEW_NAV_SECTION]}
                  onNavigate={() => setDrawerOpen(false)}
                />
                <div className={styles.railContext}>
                  <span className={styles.railEyebrow}>Active household</span>
                  <h2 className={styles.railCardTitle}>{householdHeadline}</h2>
                  <p className={styles.railContextMeta}>{householdMeta}</p>
                </div>
              </aside>
            </>
          ) : null}

          <div className={styles.main}>
            <Topbar
              activeHousehold={activeHousehold}
              activeHouseholdId={activeHouseholdId ?? undefined}
              baseCurrency={session?.user.baseCurrency ?? "SEK"}
              density={density}
              displayName={session?.user.displayName ?? "Fyrk User"}
              households={households}
              needsOnboarding={needsOnboarding}
              onHouseholdChange={(householdId) => {
                setDemoError(null);
                setActiveHouseholdId(householdId);
              }}
              onOpenMenu={() => setDrawerOpen(true)}
              onSetDensity={setDensity}
              onToggleTheme={() =>
                setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))
              }
              page={page}
              sessionError={sessionError}
              sessionLoading={sessionLoading || demoLoading}
              theme={theme}
            />

            <main className={styles.pageCanvas}>
              {needsOnboarding && pathname !== "/onboarding" ? (
                <Card
                  actions={
                    <div className={styles.setupActions}>
                      <Link
                        className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
                        href="/onboarding"
                      >
                        Continue setup
                      </Link>
                    </div>
                  }
                  className={styles.setupBanner}
                  description="Create the shared household to unlock collaborative context, member roles, and a properly personalized workspace."
                  eyebrow="Activation"
                  title="Finish household setup"
                >
                  <p className={styles.railCardText}>
                    Once setup is complete, Home and Balance Sheet shift from a personal view
                    into a shared household operating system.
                  </p>
                </Card>
              ) : null}

              <div className={styles.pageFrame}>
                <div className={styles.pageInner}>{children}</div>
              </div>
            </main>
          </div>
        </div>

        <nav aria-label="Mobile navigation" className={styles.mobileNav}>
          {MOBILE_NAV_ITEMS.map((item) => {
            const className = [
              styles.mobileNavLink,
              isActivePath(pathname, item.href) ? styles.mobileNavActive : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <Link className={className} href={item.href} key={item.href}>
                <AppIcon className={styles.mobileNavIcon} name={item.icon} />
                <span className={styles.mobileNavLabel}>{item.shortLabel}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </HouseholdContext.Provider>
  );
}
