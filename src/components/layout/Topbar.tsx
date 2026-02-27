"use client";

import type { HouseholdSummary } from "../api/contracts";

import styles from "../theme/theme.module.css";

interface TopbarProps {
  title: string;
  subtitle: string;
  households: HouseholdSummary[];
  activeHouseholdId: string | undefined;
  onHouseholdChange: (householdId: string) => void;
  theme: "light" | "dark";
  density: "narrative" | "terminal";
  onToggleTheme: () => void;
  onToggleDensity: () => void;
  onOpenMenu: () => void;
}

export function Topbar({
  title,
  subtitle,
  households,
  activeHouseholdId,
  onHouseholdChange,
  theme,
  density,
  onToggleTheme,
  onToggleDensity,
  onOpenMenu,
}: TopbarProps) {
  const fallbackHouseholds: HouseholdSummary[] =
    households.length > 0
      ? households
      : [
          {
            id: "placeholder",
            name: "No household yet",
            role: "owner",
            memberCount: 1,
          },
        ];

  const selectedHouseholdId =
    activeHouseholdId ?? fallbackHouseholds[0]?.id ?? "placeholder";

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarHeading}>
        <h1 className={styles.topbarTitle}>{title}</h1>
        <p className={styles.topbarSubtitle}>{subtitle}</p>
      </div>

      <div className={styles.topbarControls}>
        <button
          aria-label="Open menu"
          className={styles.menuButton}
          onClick={onOpenMenu}
          type="button"
        >
          ☰
        </button>

        <label className={styles.srOnly} htmlFor="household-selector">
          Household selector
        </label>
        <select
          className={styles.selectControl}
          id="household-selector"
          onChange={(event) => onHouseholdChange(event.target.value)}
          value={selectedHouseholdId}
        >
          {fallbackHouseholds.map((household) => (
            <option key={household.id} value={household.id}>
              {household.name}
            </option>
          ))}
        </select>

        <input
          aria-label="Search"
          className={styles.searchControl}
          placeholder="Search household"
          type="search"
        />

        <button
          aria-label="Toggle density mode"
          aria-pressed={density === "terminal"}
          className={styles.toggleButton}
          onClick={onToggleDensity}
          type="button"
        >
          {density === "terminal" ? "Terminal" : "Narrative"}
        </button>
        <button
          aria-label="Toggle light and dark theme"
          aria-pressed={theme === "dark"}
          className={styles.toggleButton}
          onClick={onToggleTheme}
          type="button"
        >
          {theme === "dark" ? "Dark" : "Light"}
        </button>
      </div>
    </header>
  );
}
