"use client";

import type { HouseholdSummary } from "../api/contracts";
import themeStyles from "../theme/theme.module.css";
import { MenuIcon, MoonIcon, SearchIcon, SunIcon } from "./icons";
import type { ShellPageMeta, ShellTone } from "./navigation";

import styles from "./shell.module.css";

interface TopbarProps {
  page: ShellPageMeta;
  households: HouseholdSummary[];
  activeHousehold: HouseholdSummary | null;
  activeHouseholdId: string | undefined;
  displayName: string;
  baseCurrency: string;
  density: "narrative" | "terminal";
  theme: "light" | "dark";
  needsOnboarding: boolean;
  sessionLoading: boolean;
  sessionError: string | null;
  onHouseholdChange: (householdId: string) => void;
  onSetDensity: (density: "narrative" | "terminal") => void;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
}

const fallbackHouseholds: HouseholdSummary[] = [
  {
    id: "placeholder",
    name: "Household setup",
    role: "owner",
    memberCount: 1,
  },
];

const getRoleLabel = (role: HouseholdSummary["role"]): string => {
  switch (role) {
    case "owner":
      return "Household owner";
    case "admin":
      return "Household admin";
    case "member":
      return "Household member";
    default:
      return "Household viewer";
  }
};

const statusByState = (
  needsOnboarding: boolean,
  activeHousehold: HouseholdSummary | null,
): { label: string; tone: ShellTone } => {
  if (needsOnboarding) {
    return {
      label: "Setup in progress",
      tone: "preview",
    };
  }

  if (activeHousehold) {
    return {
      label: `${activeHousehold.memberCount} member${activeHousehold.memberCount === 1 ? "" : "s"} active`,
      tone: "primary",
    };
  }

  return {
    label: "Ready for household setup",
    tone: "support",
  };
};

export function Topbar({
  page,
  households,
  activeHousehold,
  activeHouseholdId,
  displayName,
  baseCurrency,
  density,
  theme,
  needsOnboarding,
  sessionLoading,
  sessionError,
  onHouseholdChange,
  onSetDensity,
  onToggleTheme,
  onOpenMenu,
}: TopbarProps) {
  const householdOptions = households.length > 0 ? households : fallbackHouseholds;
  const selectedHouseholdId = activeHouseholdId ?? householdOptions[0]?.id ?? "placeholder";
  const workspaceStatus = statusByState(needsOnboarding, activeHousehold);
  const initial = displayName.trim().charAt(0).toUpperCase() || "F";
  const profileDetail = activeHousehold
    ? activeHousehold.isDemo
      ? `Demo workspace · ${baseCurrency}`
      : `${getRoleLabel(activeHousehold.role)} · ${baseCurrency}`
    : `Shared workspace · ${baseCurrency}`;
  const statusLabel = sessionError
    ? "Session retry needed"
    : sessionLoading
      ? "Refreshing session"
      : activeHousehold?.isDemo
        ? "Demo workspace"
        : workspaceStatus.label;
  const statusTone = sessionError
    ? "preview"
    : sessionLoading
      ? "emerging"
      : activeHousehold?.isDemo
        ? "support"
        : workspaceStatus.tone;

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarHead}>
        <button
          aria-label="Open navigation menu"
          className={[styles.iconButton, styles.menuButton].join(" ")}
          onClick={onOpenMenu}
          type="button"
        >
          <MenuIcon height={18} width={18} />
        </button>

        <div className={styles.pageIdentity}>
          <div className={styles.pageEyebrowRow}>
            <span className={styles.pageEyebrow}>{page.eyebrow}</span>
            <span className={styles.pageStatus} data-tone={page.tone}>
              {page.statusLabel}
            </span>
          </div>
          <h1 className={styles.pageTitle}>{page.title}</h1>
          <p className={styles.pageSummary}>{page.summary}</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Search</span>
          <div className={styles.searchField}>
            <SearchIcon className={styles.searchIcon} height={18} width={18} />
            <input
              aria-label="Search Fyrk"
              className={[themeStyles.searchControl, styles.searchInput].join(" ")}
              placeholder={page.searchPlaceholder}
              type="search"
            />
          </div>
        </div>

        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Status</span>
          <div className={styles.statusPill} data-tone={statusTone}>
            <span aria-hidden className={styles.statusDot} />
            <span>{statusLabel}</span>
          </div>
        </div>

        <div className={styles.controlBlock}>
          <label className={styles.controlLabel} htmlFor="household-selector">
            Household
          </label>
          <select
            className={[themeStyles.selectControl, styles.householdSelect].join(" ")}
            disabled={households.length === 0}
            id="household-selector"
            onChange={(event) => onHouseholdChange(event.target.value)}
            value={selectedHouseholdId}
          >
            {householdOptions.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>View mode</span>
          <div className={styles.densityToggle}>
            <button
              aria-pressed={density === "narrative"}
              className={[
                styles.densityOption,
                density === "narrative" ? styles.densityOptionActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSetDensity("narrative")}
              type="button"
            >
              Narrative
            </button>
            <button
              aria-pressed={density === "terminal"}
              className={[
                styles.densityOption,
                density === "terminal" ? styles.densityOptionActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSetDensity("terminal")}
              type="button"
            >
              CFO
            </button>
          </div>
        </div>

        <div className={styles.controlBlock}>
          <span className={styles.controlLabel}>Appearance</span>
          <div className={styles.utilityRow}>
            <button
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className={styles.iconButton}
              onClick={onToggleTheme}
              type="button"
            >
              {theme === "dark" ? <SunIcon height={18} width={18} /> : <MoonIcon height={18} width={18} />}
            </button>

            <div className={styles.profilePill}>
              <span aria-hidden className={styles.avatar}>
                {initial}
              </span>
              <span className={styles.profileMeta}>
                <span className={styles.profileName}>{displayName}</span>
                <span className={styles.profileDetail}>{profileDetail}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
