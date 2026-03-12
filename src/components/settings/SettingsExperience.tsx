"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useHouseholdContext } from "../accounts/useHouseholdContext";
import { signOut } from "../api/mockClient";
import styles from "../theme/theme.module.css";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { RouteState } from "../ui/RouteState";
import workspaceStyles from "./settings.module.css";

interface ExportFallbackPayload {
  activeHouseholdId: string | null;
  exportedAt: string;
  households: unknown[];
  localState: unknown;
  user: unknown;
}

const STORAGE_KEY = "fyrk:sprint1:ui-state";

const shouldUseFallbackByDefault = (): boolean =>
  process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";

const triggerJsonDownload = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener noreferrer";
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const readFallbackState = (): unknown => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return null;
  }
};

const buildFallbackExport = (
  user: unknown,
  households: unknown[],
  activeHouseholdId: string | null,
): ExportFallbackPayload => ({
  activeHouseholdId,
  exportedAt: new Date().toISOString(),
  households,
  localState: readFallbackState(),
  user,
});

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not complete that settings action.";
};

export function SettingsExperience() {
  const router = useRouter();
  const {
    activeHousehold,
    activeHouseholdId,
    density,
    session,
    setDensity,
    setTheme,
    theme,
  } = useHouseholdContext();

  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const preferenceSummary = useMemo(
    () =>
      `${theme === "dark" ? "Warm dark" : "Warm light"} · ${
        density === "terminal" ? "Terminal density" : "Narrative density"
      }`,
    [density, theme],
  );

  const handleExport = async () => {
    setError("");
    setNotice("");
    setExporting(true);

    try {
      if (shouldUseFallbackByDefault()) {
        triggerJsonDownload(
          "fyrk-data-export.json",
          buildFallbackExport(session?.user ?? null, session?.households ?? [], activeHouseholdId),
        );
      } else {
        const response = await fetch("/api/user/data-export", {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Export failed with status ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        triggerJsonDownload("fyrk-data-export.json", payload);
      }

      setNotice("Data export downloaded as JSON.");
    } catch (requestError) {
      void requestError;
      triggerJsonDownload(
        "fyrk-data-export.json",
        buildFallbackExport(session?.user ?? null, session?.households ?? [], activeHouseholdId),
      );
      setNotice("Live export was unavailable, so a local workspace export was downloaded instead.");
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = async () => {
    setError("");
    setNotice("");
    setSigningOut(true);

    try {
      await signOut();
      router.push("/login");
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section className={workspaceStyles.stack}>
      <RouteState
        description="This route now mirrors the live shell controls and adds profile, privacy, and export actions in one place."
        title="Personal operating preferences"
      >
        <p className={workspaceStyles.routeNarrative}>
          Keep preferences explicit. Narrative mode should feel editorial and calm;
          Terminal mode should stay compact without losing hierarchy or focus states.
        </p>
      </RouteState>

      <div className={workspaceStyles.layoutGrid}>
        <Card
          className={workspaceStyles.preferenceCard}
          title="Display preferences"
          description="The same settings apply instantly to every authenticated surface."
          actions={
            <span className={[styles.chip, styles.chipMuted].join(" ")}>{preferenceSummary}</span>
          }
        >
          <div className={workspaceStyles.preferenceGroup}>
            <div className={workspaceStyles.preferenceHeader}>
              <h3 className={workspaceStyles.preferenceTitle}>Theme</h3>
              <p className={workspaceStyles.preferenceText}>
                Warm Authority stays warm in both light and dark modes.
              </p>
            </div>
            <div className={[styles.segmentedControl, styles.segmentedControlBlock].join(" ")}>
              {[
                {
                  hint: "Editorial daylight",
                  label: "Warm light",
                  value: "light" as const,
                },
                {
                  hint: "Warm charcoal",
                  label: "Warm dark",
                  value: "dark" as const,
                },
              ].map((option) => (
                <button
                  aria-pressed={theme === option.value}
                  className={[
                    styles.segmentedOption,
                    theme === option.value ? styles.segmentedOptionActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                  }}
                  type="button"
                >
                  <span className={styles.segmentedOptionLabel}>
                    <span>{option.label}</span>
                    <span className={styles.segmentedOptionHint}>{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={workspaceStyles.preferenceGroup}>
            <div className={workspaceStyles.preferenceHeader}>
              <h3 className={workspaceStyles.preferenceTitle}>Density</h3>
              <p className={workspaceStyles.preferenceText}>
                Switch between narrative comfort and CFO-level information density.
              </p>
            </div>
            <div className={[styles.segmentedControl, styles.segmentedControlBlock].join(" ")}>
              {[
                {
                  hint: "Serif narrative and generous spacing",
                  label: "Narrative",
                  value: "narrative" as const,
                },
                {
                  hint: "Mono figures and compressed spacing",
                  label: "Terminal",
                  value: "terminal" as const,
                },
              ].map((option) => (
                <button
                  aria-pressed={density === option.value}
                  className={[
                    styles.segmentedOption,
                    density === option.value ? styles.segmentedOptionActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={option.value}
                  onClick={() => {
                    setDensity(option.value);
                  }}
                  type="button"
                >
                  <span className={styles.segmentedOptionLabel}>
                    <span>{option.label}</span>
                    <span className={styles.segmentedOptionHint}>{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card
          className={workspaceStyles.profileCard}
          title="Profile and workspace"
          description="The current session and household context that power the authenticated shell."
        >
          <dl className={workspaceStyles.detailList}>
            <div className={workspaceStyles.detailRow}>
              <dt className={workspaceStyles.detailLabel}>Display name</dt>
              <dd className={workspaceStyles.detailValue}>
                {session?.user.displayName || "Fyrk user"}
              </dd>
            </div>
            <div className={workspaceStyles.detailRow}>
              <dt className={workspaceStyles.detailLabel}>Email</dt>
              <dd className={workspaceStyles.detailValue}>
                {session?.user.email || "No email stored yet"}
              </dd>
            </div>
            <div className={workspaceStyles.detailRow}>
              <dt className={workspaceStyles.detailLabel}>Base currency</dt>
              <dd className={workspaceStyles.detailValue}>
                {session?.user.baseCurrency ?? "SEK"}
              </dd>
            </div>
            <div className={workspaceStyles.detailRow}>
              <dt className={workspaceStyles.detailLabel}>Active household</dt>
              <dd className={workspaceStyles.detailValue}>
                {activeHousehold?.name ?? "None selected"}
              </dd>
            </div>
          </dl>
          <p className={workspaceStyles.profileNote}>
            Household-specific visuals, reviews, and imports follow the active household selector in the top bar.
          </p>
        </Card>
      </div>

      <Card
        className={workspaceStyles.privacyCard}
        title="Privacy and account actions"
        description="Use export for a portable snapshot and sign out when you leave a shared device."
      >
        <div className={workspaceStyles.actionRow}>
          <Button disabled={exporting} onClick={handleExport} variant="secondary">
            {exporting ? "Preparing export..." : "Export data"}
          </Button>
          <Button disabled={signingOut} onClick={handleSignOut} variant="ghost">
            {signingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
        {notice ? (
          <p className={workspaceStyles.successText} role="status">
            {notice}
          </p>
        ) : null}
        {error ? <p className={workspaceStyles.errorText}>{error}</p> : null}
      </Card>
    </section>
  );
}
