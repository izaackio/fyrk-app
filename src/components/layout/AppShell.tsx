"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getSession, initializeDemoHousehold } from "../api/mockClient";
import type { DemoVariant, SessionResponseData } from "../api/contracts";
import { DEMO_VARIANT_LABELS } from "../api/demo-options";
import styles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { MOBILE_NAV_ITEMS, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./navigation";
import {
  HouseholdContext,
  type OnboardingState,
} from "./household-context";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";

const THEME_STORAGE_KEY = "fyrk:sprint1:theme";
const DENSITY_STORAGE_KEY = "fyrk:sprint1:density";
const ACTIVE_HOUSEHOLD_STORAGE_KEY = "fyrk:sprint6:active-household";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Household overview, weekly progress, and calm next actions.",
  },
  "/onboarding": {
    title: "Onboarding",
    subtitle: "Choose demo or real setup, then finish with a clear next step.",
  },
  "/balance-sheet": {
    title: "Balance Sheet",
    subtitle: "Unified household net worth, allocation, and data quality.",
  },
  "/timeline": {
    title: "Timeline",
    subtitle: "Track household decisions, milestones, and follow-through over time.",
  },
  "/events": {
    title: "Life Events",
    subtitle: "Guided playbooks for major changes, assignments, and checklist progress.",
  },
  "/review": {
    title: "Quarterly Review",
    subtitle: "Review household progress, risks, and publication readiness.",
  },
  "/fitness": {
    title: "Financial Fitness",
    subtitle: "Score resilience, weakest areas, and the next best improvements.",
  },
  "/proposals": {
    title: "Proposals",
    subtitle: "Discuss decisions together and move them to approval with context.",
  },
  "/household": {
    title: "Household",
    subtitle: "Household members, invites, and collaboration settings.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Profile, privacy, and display preferences for the app shell.",
  },
};

interface AppShellProps {
  children: ReactNode;
}

const derivePageMeta = (pathname: string): { title: string; subtitle: string } => {
  const exactMatch = PAGE_META[pathname];
  if (exactMatch) {
    return exactMatch;
  }

  const partialMatch = Object.entries(PAGE_META).find(([path]) => pathname.startsWith(path));
  if (partialMatch) {
    return partialMatch[1];
  }

  return {
    title: "Fyrk",
    subtitle: "Digital family office for modern households.",
  };
};

const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

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
    households.find((household) => household.id === activeHouseholdId) ?? null;
  const onboardingState = deriveOnboardingState(session);
  const pageMeta = useMemo(() => derivePageMeta(pathname), [pathname]);
  const activeDemoVariant =
    activeHousehold?.isDemo && activeHousehold.demoVariant ? activeHousehold.demoVariant : null;

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
      <div className={styles.themeRoot} data-density={density} data-theme={theme}>
        <div className={styles.appShell}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <span className={styles.logo}>
                <span aria-hidden className={styles.logoGlyph}>
                  F
                </span>
                Fyrk
              </span>
              <p className={styles.sidebarTitle}>Warm Authority · Launch baseline</p>
            </div>
            <SidebarNav items={PRIMARY_NAV_ITEMS} />
            <div className={styles.navFooter}>
              <SidebarNav items={SECONDARY_NAV_ITEMS} />
            </div>
          </aside>

          {drawerOpen ? (
            <>
              <button
                aria-label="Close menu"
                className={styles.overlay}
                onClick={() => setDrawerOpen(false)}
                type="button"
              />
              <aside className={styles.drawer}>
                <div className={styles.sidebarHeader}>
                  <span className={styles.logo}>
                    <span aria-hidden className={styles.logoGlyph}>
                      F
                    </span>
                    Fyrk
                  </span>
                  <p className={styles.sidebarTitle}>Navigation</p>
                </div>
                <SidebarNav
                  items={[...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS]}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </aside>
            </>
          ) : null}

          <div className={styles.mainFrame}>
            <Topbar
              activeHousehold={activeHousehold}
              density={density}
              disabled={sessionLoading || demoLoading}
              hasRealHouseholds={realHouseholds.length > 0}
              onOpenMenu={() => setDrawerOpen(true)}
              onSelectHousehold={(householdId) => {
                setDemoError(null);
                setActiveHouseholdId(householdId);
              }}
              onStartDemo={startDemo}
              onToggleDensity={() =>
                setDensity((current) =>
                  current === "narrative" ? "terminal" : "narrative",
                )
              }
              onToggleTheme={() =>
                setTheme((current) => (current === "light" ? "dark" : "light"))
              }
              realHouseholds={realHouseholds}
              sessionError={sessionError}
              sessionLoading={sessionLoading}
              subtitle={pageMeta.subtitle}
              theme={theme}
              title={pageMeta.title}
            />

            <main className={styles.pageBody}>
              {sessionError && !session ? (
                <Card
                  className={styles.noticeCard}
                  title="App shell unavailable"
                  description={sessionError}
                  actions={
                    <button
                      className={[styles.button, styles.buttonSecondary].join(" ")}
                      onClick={() => {
                        void loadSession();
                      }}
                      type="button"
                    >
                      Retry session
                    </button>
                  }
                >
                  <p className={styles.noticeBody}>
                    The shell could not confirm your session, so household-scoped routes are
                    paused until the retry succeeds.
                  </p>
                </Card>
              ) : null}

              {activeDemoVariant ? (
                <Card
                  className={styles.noticeCard}
                  title={`Demo workspace active · ${DEMO_VARIANT_LABELS[activeDemoVariant]}`}
                  description="Demo households are read-only. You can explore the product safely, then switch back to your own data at any time."
                >
                  <div className={styles.noticeStack}>
                    <p className={styles.noticeBody}>
                      Current household: <strong>{activeHousehold?.name}</strong>
                    </p>
                    <div className={styles.noticeActions}>
                      {realHouseholds[0] ? (
                        <button
                          className={[styles.button, styles.buttonPrimary].join(" ")}
                          onClick={() => {
                            setActiveHouseholdId(realHouseholds[0]?.id ?? null);
                          }}
                          type="button"
                        >
                          Switch to real household
                        </button>
                      ) : (
                        <Link
                          className={[styles.button, styles.buttonPrimary].join(" ")}
                          href="/onboarding"
                        >
                          Create your own household
                        </Link>
                      )}
                      <Link
                        className={[styles.button, styles.buttonGhost].join(" ")}
                        href="/onboarding"
                      >
                        Review onboarding steps
                      </Link>
                    </div>
                  </div>
                </Card>
              ) : null}

              {onboardingState === "not_started" && pathname !== "/onboarding" ? (
                <Card
                  className={styles.noticeCard}
                  title="Finish setup or launch a guided demo"
                  description="Create your household for real data, or use a demo scenario to walk through the product before connecting anything."
                >
                  <div className={styles.noticeActions}>
                    <Link
                      className={[styles.button, styles.buttonPrimary].join(" ")}
                      href="/onboarding"
                    >
                      Open onboarding
                    </Link>
                    <Link
                      className={[styles.button, styles.buttonGhost].join(" ")}
                      href="/dashboard"
                    >
                      Browse the shell
                    </Link>
                  </div>
                </Card>
              ) : null}

              {onboardingState === "demo_ready" && !activeDemoVariant && pathname !== "/onboarding" ? (
                <Card
                  className={styles.noticeCard}
                  title="Demo access is ready"
                  description="Your demo membership is active. Select a demo scenario from the top bar whenever you want to explore the sample data again."
                >
                  <div className={styles.noticeActions}>
                    <Link
                      className={[styles.button, styles.buttonPrimary].join(" ")}
                      href="/onboarding"
                    >
                      Set up your real household
                    </Link>
                  </div>
                </Card>
              ) : null}

              {children}
            </main>
          </div>
        </div>

        <nav aria-label="Mobile navigation" className={styles.mobileNav}>
          {MOBILE_NAV_ITEMS.map((item) => {
            const className = [styles.mobileNavLink, isActivePath(pathname, item.href) ? styles.mobileNavActive : ""]
              .filter(Boolean)
              .join(" ");

            return (
              <Link className={className} href={item.href} key={item.href}>
                <span aria-hidden>{item.icon}</span>
                <span className={styles.mobileNavLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </HouseholdContext.Provider>
  );
}
