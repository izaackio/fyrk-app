"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getSession } from "../api/mockClient";
import type { HouseholdSummary, SessionResponseData } from "../api/contracts";
import styles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { MOBILE_NAV_ITEMS, PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./navigation";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";

const THEME_STORAGE_KEY = "fyrk:sprint1:theme";
const DENSITY_STORAGE_KEY = "fyrk:sprint1:density";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Household overview and weekly narrative.",
  },
  "/onboarding": {
    title: "Create Your Household",
    subtitle: "Set up your shared household and invite your partner.",
  },
  "/balance-sheet": {
    title: "Balance Sheet",
    subtitle: "Placeholder for Sprint 2 account and allocation data.",
  },
  "/timeline": {
    title: "Timeline",
    subtitle: "Track major financial decisions and milestones.",
  },
  "/events": {
    title: "Life Events",
    subtitle: "Launch event playbooks when important moments happen.",
  },
  "/review": {
    title: "Quarterly Review",
    subtitle: "Quarterly household review placeholder.",
  },
  "/fitness": {
    title: "Financial Fitness",
    subtitle: "Fitness score placeholder and improvement path.",
  },
  "/proposals": {
    title: "Proposals",
    subtitle: "Collaborative household decisions and approvals.",
  },
  "/household": {
    title: "Household",
    subtitle: "Manage household members and invitations.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Profile, preferences, and privacy controls.",
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

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [density, setDensity] = useState<"narrative" | "terminal">("narrative");
  const [session, setSession] = useState<SessionResponseData | null>(null);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }

    const savedDensity = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (savedDensity === "narrative" || savedDensity === "terminal") {
      setDensity(savedDensity);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    let cancelled = false;

    void getSession().then((response) => {
      if (cancelled) {
        return;
      }

      setSession(response.data);
      setActiveHouseholdId(response.data.households[0]?.id);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const households: HouseholdSummary[] = session?.households ?? [];
  const pageMeta = useMemo(() => derivePageMeta(pathname), [pathname]);
  const needsOnboarding = Boolean(session && !session.user.onboardingCompleted);

  return (
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
            <p className={styles.sidebarTitle}>Warm Authority · Sprint 1 Shell</p>
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
            activeHouseholdId={activeHouseholdId}
            density={density}
            households={households}
            onHouseholdChange={setActiveHouseholdId}
            onOpenMenu={() => setDrawerOpen(true)}
            onToggleDensity={() =>
              setDensity((current) =>
                current === "narrative" ? "terminal" : "narrative",
              )
            }
            onToggleTheme={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
            subtitle={pageMeta.subtitle}
            theme={theme}
            title={pageMeta.title}
          />
          <main className={styles.pageBody}>
            {needsOnboarding && pathname !== "/onboarding" ? (
              <Card
                title="Complete setup to activate your household"
                description="Create your household to unlock collaboration, invites, and dashboard personalization."
              >
                <Link
                  className={[styles.button, styles.buttonPrimary].join(" ")}
                  href="/onboarding"
                >
                  Continue onboarding
                </Link>
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
  );
}
