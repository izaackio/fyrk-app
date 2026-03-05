"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { formatDate } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import type {
  TimelineCategory,
  TimelineEntry,
  TimelineEntryType,
  TimelineFilters,
} from "../sprint4/contracts";
import { ApiClientError } from "../sprint4/http";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import {
  createTimelineEntry,
  deleteTimelineEntry,
  listTimelineEntries,
} from "./client";
import styles from "./timeline.module.css";

const typeOptions: Array<{ label: string; value: TimelineEntryType | "all" }> = [
  { label: "All types", value: "all" },
  { label: "Life events", value: "life_event" },
  { label: "Decisions", value: "decision" },
  { label: "Milestones", value: "milestone" },
  { label: "Reviews", value: "review" },
  { label: "System", value: "system" },
  { label: "Notes", value: "note" },
];

const categoryOptions: Array<{ label: string; value: TimelineCategory | "all" }> = [
  { label: "All categories", value: "all" },
  { label: "Housing", value: "housing" },
  { label: "Family", value: "family" },
  { label: "Career", value: "career" },
  { label: "Investing", value: "investing" },
  { label: "Debt", value: "debt" },
  { label: "Insurance", value: "insurance" },
  { label: "Tax", value: "tax" },
  { label: "Planning", value: "planning" },
  { label: "Other", value: "other" },
];

const createTypeLabel = (entryType: TimelineEntryType): string => {
  const found = typeOptions.find((option) => option.value === entryType);
  return found?.label ?? entryType;
};

const createCategoryLabel = (category: TimelineCategory): string => {
  const found = categoryOptions.find((option) => option.value === category);
  return found?.label ?? category;
};

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load timeline entries. Try again.";
};

const isManualEntry = (entry: TimelineEntry): boolean =>
  entry.entryType !== "system" && entry.linkedEvent === null;

export function TimelineExperience() {
  const {
    activeHouseholdId,
    error: householdError,
    loading: householdLoading,
    session,
  } = useHouseholdContext();

  const actor = useMemo(
    () =>
      session
        ? {
            displayName: session.user.displayName || "You",
            id: session.user.id,
          }
        : null,
    [session],
  );

  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  const [selectedType, setSelectedType] = useState<TimelineEntryType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<TimelineCategory | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includeFuture, setIncludeFuture] = useState(true);

  const [entryType, setEntryType] = useState<TimelineEntryType>("note");
  const [entryCategory, setEntryCategory] = useState<TimelineCategory>("planning");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryTitle, setEntryTitle] = useState("");
  const [entryDescription, setEntryDescription] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    setHasLoaded(false);
    setEntries([]);
    setError(null);
    setDeleteError(null);
    setSubmitError(null);
  }, [activeHouseholdId]);

  const filters = useMemo<TimelineFilters>(() => {
    const nextFilters: TimelineFilters = {};

    if (selectedCategory !== "all") {
      nextFilters.categories = [selectedCategory];
    }

    if (selectedType !== "all") {
      nextFilters.types = [selectedType];
    }

    if (fromDate) {
      nextFilters.from = fromDate;
    }

    if (toDate) {
      nextFilters.to = toDate;
    }

    if (search) {
      nextFilters.search = search;
    }

    return nextFilters;
  }, [fromDate, search, selectedCategory, selectedType, toDate]);

  const loadEntries = useCallback(async () => {
    if (!activeHouseholdId) {
      setEntries([]);
      return;
    }

    setError(null);

    if (!hasLoaded) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const response = await listTimelineEntries({
        actor,
        filters,
        householdId: activeHouseholdId,
      });

      setEntries(response.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoaded(true);
    }
  }, [activeHouseholdId, actor, filters, hasLoaded]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const visibleEntries = useMemo(
    () =>
      includeFuture ? entries : entries.filter((entry) => !entry.isFuture),
    [entries, includeFuture],
  );

  const handleManualSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeHouseholdId || !actor) {
      return;
    }

    setSubmitError(null);
    setSubmitting(true);

    try {
      const payloadTitle = entryTitle.trim();
      if (!payloadTitle) {
        throw new ApiClientError("VALIDATION_ERROR", "Entry title is required.");
      }

      await createTimelineEntry({
        category: entryCategory,
        createdBy: actor,
        description: entryDescription.trim() ? entryDescription.trim() : null,
        entryDate,
        entryType,
        householdId: activeHouseholdId,
        title: payloadTitle,
      });

      setEntryTitle("");
      setEntryDescription("");
      setEntryDate(new Date().toISOString().slice(0, 10));

      await loadEntries();
    } catch (requestError) {
      setSubmitError(describeError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!activeHouseholdId || !actor) {
      return;
    }

    setDeleteError(null);
    setDeletingEntryId(entryId);

    try {
      await deleteTimelineEntry({
        actor,
        householdId: activeHouseholdId,
        id: entryId,
      });

      await loadEntries();
    } catch (requestError) {
      setDeleteError(describeError(requestError));
    } finally {
      setDeletingEntryId(null);
    }
  };

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading timeline">
        <p className={styles.stateMessage}>Fetching household context and timeline history...</p>
      </Card>
    );
  }

  if (householdError) {
    return (
      <Card className={styles.stateCard} title="Could not load household">
        <p className={styles.errorText}>{householdError}</p>
      </Card>
    );
  }

  if (!activeHouseholdId || !actor) {
    return (
      <Card className={styles.stateCard} title="No household yet">
        <p className={styles.stateMessage}>
          Timeline history activates once your household is created.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  return (
    <section className={styles.stack}>
      <Card className={styles.controlCard} title="Filter timeline">
        <div className={styles.filtersGrid}>
          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>Entry type</span>
            <select
              className={themeStyles.inputControl}
              onChange={(event) => {
                setSelectedType(event.target.value as TimelineEntryType | "all");
              }}
              value={selectedType}
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>Category</span>
            <select
              className={themeStyles.inputControl}
              onChange={(event) => {
                setSelectedCategory(event.target.value as TimelineCategory | "all");
              }}
              value={selectedCategory}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>From</span>
            <input
              className={themeStyles.inputControl}
              onChange={(event) => {
                setFromDate(event.target.value);
              }}
              type="date"
              value={fromDate}
            />
          </label>

          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>To</span>
            <input
              className={themeStyles.inputControl}
              onChange={(event) => {
                setToDate(event.target.value);
              }}
              type="date"
              value={toDate}
            />
          </label>

          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>Search</span>
            <input
              className={themeStyles.inputControl}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              placeholder="Search title or notes"
              value={searchInput}
            />
          </label>
        </div>

        <div className={styles.filterActions}>
          <label className={styles.checkboxLabel}>
            <input
              checked={includeFuture}
              onChange={(event) => {
                setIncludeFuture(event.target.checked);
              }}
              type="checkbox"
            />
            Include future entries
          </label>

          <button
            className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
            onClick={() => {
              void loadEntries();
            }}
            type="button"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </Card>

      <Card className={styles.controlCard} title="Add manual timeline entry">
        <form className={styles.form} onSubmit={handleManualSubmit}>
          <div className={styles.formGrid}>
            <label className={themeStyles.inputStack}>
              <span className={themeStyles.inputLabel}>Entry type</span>
              <select
                className={themeStyles.inputControl}
                onChange={(event) => {
                  setEntryType(event.target.value as TimelineEntryType);
                }}
                value={entryType}
              >
                {typeOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className={themeStyles.inputStack}>
              <span className={themeStyles.inputLabel}>Category</span>
              <select
                className={themeStyles.inputControl}
                onChange={(event) => {
                  setEntryCategory(event.target.value as TimelineCategory);
                }}
                value={entryCategory}
              >
                {categoryOptions
                  .filter((option) => option.value !== "all")
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>

            <label className={themeStyles.inputStack}>
              <span className={themeStyles.inputLabel}>Date</span>
              <input
                className={themeStyles.inputControl}
                onChange={(event) => {
                  setEntryDate(event.target.value);
                }}
                required
                type="date"
                value={entryDate}
              />
            </label>
          </div>

          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>Title</span>
            <input
              className={themeStyles.inputControl}
              maxLength={120}
              onChange={(event) => {
                setEntryTitle(event.target.value);
              }}
              placeholder="Example: Increased monthly investment by 2,000 SEK"
              required
              value={entryTitle}
            />
          </label>

          <label className={themeStyles.inputStack}>
            <span className={themeStyles.inputLabel}>Description</span>
            <textarea
              className={styles.textarea}
              onChange={(event) => {
                setEntryDescription(event.target.value);
              }}
              placeholder="Context, assumptions, or follow-up notes"
              rows={3}
              value={entryDescription}
            />
          </label>

          {submitError ? <p className={styles.errorText}>{submitError}</p> : null}

          <div className={styles.submitRow}>
            <button
              className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Saving entry..." : "Save entry"}
            </button>
          </div>
        </form>
      </Card>

      {loading ? (
        <Card className={styles.stateCard} title="Loading timeline">
          <p className={styles.stateMessage}>Preparing your chronological household history...</p>
        </Card>
      ) : null}

      {!loading && error && entries.length === 0 ? (
        <Card className={styles.stateCard} title="Could not load timeline">
          <p className={styles.errorText}>{error}</p>
          <button
            className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
            onClick={() => {
              void loadEntries();
            }}
            type="button"
          >
            Retry
          </button>
        </Card>
      ) : null}

      {error && entries.length > 0 ? (
        <Card className={styles.stateCard} title="Refresh issue">
          <p className={styles.errorText}>{error}</p>
        </Card>
      ) : null}

      {deleteError ? (
        <Card className={styles.stateCard} title="Could not remove entry">
          <p className={styles.errorText}>{deleteError}</p>
        </Card>
      ) : null}

      {!loading && !error && visibleEntries.length === 0 ? (
        <Card className={styles.stateCard} title="No entries for these filters">
          <p className={styles.stateMessage}>
            Adjust filters or add a manual timeline entry to record key household decisions.
          </p>
        </Card>
      ) : null}

      {!loading && visibleEntries.length > 0 ? (
        <ol className={styles.timelineList}>
          {visibleEntries.map((entry) => (
            <li className={styles.timelineItem} key={entry.id}>
              <div className={styles.timelineRail}>
                <span className={[styles.timelineDot, styles[`dot${entry.entryType}`]].join(" ")} />
              </div>

              <article className={styles.timelineCard}>
                <header className={styles.cardHeader}>
                  <div className={styles.cardHeading}>
                    <p className={styles.entryDate}>{formatDate(entry.entryDate)}</p>
                    <h3 className={styles.entryTitle}>{entry.title}</h3>
                  </div>

                  <div className={styles.badges}>
                    <span className={[themeStyles.chip, themeStyles.chipMuted].join(" ")}>
                      {createTypeLabel(entry.entryType)}
                    </span>
                    <span className={styles.categoryBadge}>{createCategoryLabel(entry.category)}</span>
                  </div>
                </header>

                {entry.description ? (
                  <p className={styles.entryDescription}>{entry.description}</p>
                ) : null}

                <footer className={styles.cardFooter}>
                  <span className={styles.entryMeta}>Logged by {entry.createdBy.displayName}</span>

                  <div className={styles.cardActions}>
                    {entry.linkedEvent ? (
                      <Link
                        className={[themeStyles.button, themeStyles.buttonGhost, themeStyles.buttonSm].join(" ")}
                        href={`/events/${entry.linkedEvent.id}`}
                      >
                        Open playbook
                      </Link>
                    ) : null}

                    {isManualEntry(entry) ? (
                      <button
                        className={[themeStyles.button, themeStyles.buttonSecondary, themeStyles.buttonSm].join(" ")}
                        disabled={deletingEntryId === entry.id}
                        onClick={() => {
                          void handleDelete(entry.id);
                        }}
                        type="button"
                      >
                        {deletingEntryId === entry.id ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </footer>
              </article>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
