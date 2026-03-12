"use client";

import { useState } from "react";

import { DEMO_VARIANT_OPTIONS, DEMO_VARIANT_LABELS } from "../api/demo-options";
import type { DemoVariant, HouseholdSummary } from "../api/contracts";
import styles from "../theme/theme.module.css";

interface TopbarProps {
  title: string;
  subtitle: string;
  activeHousehold: HouseholdSummary | null;
  realHouseholds: HouseholdSummary[];
  hasRealHouseholds: boolean;
  disabled?: boolean;
  sessionLoading: boolean;
  sessionError: string | null;
  theme: "light" | "dark";
  density: "narrative" | "terminal";
  onSelectHousehold: (householdId: string) => void;
  onStartDemo: (variant: DemoVariant) => Promise<unknown>;
  onToggleTheme: () => void;
  onToggleDensity: () => void;
  onOpenMenu: () => void;
}

export function Topbar({
  title,
  subtitle,
  activeHousehold,
  realHouseholds,
  hasRealHouseholds,
  disabled = false,
  sessionLoading,
  sessionError,
  theme,
  density,
  onSelectHousehold,
  onStartDemo,
  onToggleTheme,
  onToggleDensity,
  onOpenMenu,
}: TopbarProps) {
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const selectorValue = activeHousehold?.isDemo
    ? `demo:${activeHousehold.demoVariant ?? "standard"}`
    : activeHousehold
      ? `household:${activeHousehold.id}`
      : "none";
  const displayedSelectorValue = disabled && pendingValue ? pendingValue : selectorValue;

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarHeading}>
        <h1 className={styles.topbarTitle}>{title}</h1>
        <p className={styles.topbarSubtitle}>{subtitle}</p>
        <div className={styles.topbarStatusRow}>
          {activeHousehold?.isDemo ? (
            <span className={[styles.statusPill, styles.statusPillDemo].join(" ")}>
              Demo workspace · read-only
            </span>
          ) : activeHousehold ? (
            <span className={[styles.statusPill, styles.statusPillPositive].join(" ")}>
              Real household selected
            </span>
          ) : null}
          {sessionLoading ? (
            <span className={[styles.statusPill, styles.statusPillNeutral].join(" ")}>
              Refreshing session
            </span>
          ) : null}
          {sessionError ? (
            <span className={[styles.statusPill, styles.statusPillWarning].join(" ")}>
              Session retry needed
            </span>
          ) : null}
        </div>
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

        <div className={styles.selectorStack}>
          <label className={styles.srOnly} htmlFor="household-selector">
            Household or demo selector
          </label>
          <select
            className={styles.selectControl}
            disabled={disabled}
            id="household-selector"
            onChange={(event) => {
              const nextValue = event.target.value;

              if (nextValue.startsWith("household:")) {
                setPendingValue(null);
                onSelectHousehold(nextValue.slice("household:".length));
                return;
              }

              if (nextValue.startsWith("demo:")) {
                setPendingValue(nextValue);
                void onStartDemo(nextValue.slice("demo:".length) as DemoVariant).catch(() => {
                  setPendingValue(null);
                });
              }
            }}
            value={displayedSelectorValue}
          >
            {!activeHousehold ? (
              <option disabled value="none">
                Select a household or demo
              </option>
            ) : null}
            {realHouseholds.length > 0 ? (
              <optgroup label="Your households">
                {realHouseholds.map((household) => (
                  <option key={household.id} value={`household:${household.id}`}>
                    {household.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label="Demo scenarios">
              {DEMO_VARIANT_OPTIONS.map((option) => (
                <option key={option.value} value={`demo:${option.value}`}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
          <p className={styles.selectorHint}>
            {activeHousehold?.isDemo
              ? `${DEMO_VARIANT_LABELS[activeHousehold.demoVariant ?? "standard"]} active`
              : hasRealHouseholds
                ? "Switch between your real household and guided demos."
                : "Use a demo now, then create your own household when ready."}
          </p>
        </div>

        <button
          aria-label="Toggle information density"
          aria-pressed={density === "terminal"}
          className={styles.toggleButton}
          onClick={onToggleDensity}
          type="button"
        >
          {density === "terminal" ? "Compact" : "Comfort"}
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
