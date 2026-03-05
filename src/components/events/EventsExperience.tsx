"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { formatDate, formatNumber } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import type { EventLibraryItem, LifeEvent } from "../sprint4/contracts";
import { ApiClientError } from "../sprint4/http";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { listEventLibrary, listLifeEvents, triggerLifeEvent } from "./client";
import styles from "./events.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load life events. Try again.";
};

const toNumberOrNull = (value: string): number | null => {
  const normalized = value.replaceAll(/[^\d.-]+/g, "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
};

const defaultInputValue = (field: EventLibraryItem["requiredInputs"][number]): string => {
  if (field.type === "date" && field.key === "targetDate") {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toISOString().slice(0, 10);
  }

  return "";
};

const createProgressLabel = (event: LifeEvent): string =>
  `${event.progress.completed + event.progress.skipped}/${event.progress.total} actions resolved`;

export function EventsExperience() {
  const router = useRouter();

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

  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [library, setLibrary] = useState<EventLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedLibraryEventType, setSelectedLibraryEventType] = useState<
    EventLibraryItem["eventType"] | null
  >(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});

  const selectedLibraryItem = useMemo(
    () =>
      selectedLibraryEventType
        ? library.find((item) => item.eventType === selectedLibraryEventType) ?? null
        : null,
    [library, selectedLibraryEventType],
  );

  const initializeDraft = useCallback((item: EventLibraryItem) => {
    setSelectedLibraryEventType(item.eventType);
    setDraftTitle(item.title);
    setCreateError(null);

    setDraftInputs(
      Object.fromEntries(
        item.requiredInputs.map((field) => [field.key, defaultInputValue(field)]),
      ),
    );
  }, []);

  const loadData = useCallback(async () => {
    if (!activeHouseholdId) {
      setEvents([]);
      setLibrary([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [eventsResponse, libraryResponse] = await Promise.all([
        listLifeEvents({
          actor,
          householdId: activeHouseholdId,
        }),
        listEventLibrary(),
      ]);

      setEvents(eventsResponse.data);
      setLibrary(libraryResponse.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId, actor]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeEvents = useMemo(
    () => events.filter((event) => event.status === "active"),
    [events],
  );

  const completedEvents = useMemo(
    () => events.filter((event) => event.status === "completed"),
    [events],
  );

  const handleTrigger = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeHouseholdId || !actor || !selectedLibraryItem) {
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const parsedInputs: Record<string, string | number | null> = {};

      for (const field of selectedLibraryItem.requiredInputs) {
        const rawValue = draftInputs[field.key] ?? "";
        const trimmedValue = rawValue.trim();

        if (!trimmedValue) {
          if (field.required) {
            throw new ApiClientError(
              "VALIDATION_ERROR",
              `${field.label} is required before generating a playbook.`,
            );
          }

          parsedInputs[field.key] = null;
          continue;
        }

        if (field.type === "currency" || field.type === "number") {
          const parsedNumber = toNumberOrNull(trimmedValue);
          if (parsedNumber === null) {
            throw new ApiClientError(
              "VALIDATION_ERROR",
              `${field.label} must be a valid number.`,
            );
          }

          parsedInputs[field.key] = parsedNumber;
          continue;
        }

        parsedInputs[field.key] = trimmedValue;
      }

      const response = await triggerLifeEvent({
        actor,
        payload: {
          eventType: selectedLibraryItem.eventType,
          householdId: activeHouseholdId,
          inputs: parsedInputs,
          title: draftTitle.trim() || selectedLibraryItem.title,
        },
      });

      setSelectedLibraryEventType(null);
      setDraftTitle("");
      setDraftInputs({});

      await loadData();
      router.push(`/events/${response.data.id}`);
    } catch (requestError) {
      setCreateError(describeError(requestError));
    } finally {
      setCreating(false);
    }
  };

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading events">
        <p className={styles.stateMessage}>Fetching household context and event playbooks...</p>
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
          Life-event playbooks become available once your household is created.
        </p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  return (
    <section className={styles.stack}>
      <Card className={styles.stateCard} title="Life event playbooks" description="Trigger an event, then work through action checklists and assignments.">
        <button
          className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
          onClick={() => {
            void loadData();
          }}
          type="button"
        >
          {loading ? "Refreshing..." : "Refresh events"}
        </button>
      </Card>

      {error ? (
        <Card className={styles.stateCard} title="Could not load events">
          <p className={styles.errorText}>{error}</p>
        </Card>
      ) : null}

      <Card className={styles.stateCard} title="Active playbooks">
        {loading && events.length === 0 ? (
          <p className={styles.stateMessage}>Loading active playbooks...</p>
        ) : null}

        {!loading && activeEvents.length === 0 ? (
          <p className={styles.stateMessage}>
            No active events. Start one from the library to generate a playbook checklist.
          </p>
        ) : null}

        {activeEvents.length > 0 ? (
          <div className={styles.eventGrid}>
            {activeEvents.map((eventItem) => (
              <article className={styles.eventCard} key={eventItem.id}>
                <header className={styles.eventHeader}>
                  <div>
                    <h3 className={styles.eventTitle}>{eventItem.title}</h3>
                    <p className={styles.eventMeta}>
                      {eventItem.targetDate
                        ? `Target date ${formatDate(eventItem.targetDate)}`
                        : "No target date"}
                    </p>
                  </div>
                  <span className={[themeStyles.chip, themeStyles.chipPositive].join(" ")}>Active</span>
                </header>

                <p className={styles.eventSummary}>{eventItem.impactSummary}</p>

                <div className={styles.progressWrap}>
                  <div aria-hidden className={styles.progressBar}>
                    <span
                      className={styles.progressValue}
                      style={{ width: `${eventItem.progress.pct}%` }}
                    />
                  </div>
                  <p className={styles.progressLabel}>{createProgressLabel(eventItem)}</p>
                </div>

                <footer className={styles.eventFooter}>
                  <span className={styles.subtleLabel}>{formatNumber(eventItem.progress.pct)}% complete</span>
                  <Link className={[themeStyles.button, themeStyles.buttonPrimary, themeStyles.buttonSm].join(" ")} href={`/events/${eventItem.id}`}>
                    Open checklist
                  </Link>
                </footer>
              </article>
            ))}
          </div>
        ) : null}
      </Card>

      {completedEvents.length > 0 ? (
        <Card className={styles.stateCard} title="Completed events">
          <div className={styles.completedList}>
            {completedEvents.map((eventItem) => (
              <div className={styles.completedRow} key={eventItem.id}>
                <div>
                  <p className={styles.completedTitle}>{eventItem.title}</p>
                  <p className={styles.completedMeta}>
                    Completed {formatDate(eventItem.updatedAt)} · {eventItem.progress.total} actions
                  </p>
                </div>
                <Link className={[themeStyles.button, themeStyles.buttonGhost, themeStyles.buttonSm].join(" ")} href={`/events/${eventItem.id}`}>
                  View details
                </Link>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className={styles.stateCard} title="Event library" description="Choose an event type and generate a guided playbook.">
        <div className={styles.libraryGrid}>
          {library.map((item) => (
            <article className={styles.libraryCard} key={item.eventType}>
              <header className={styles.libraryHeader}>
                <h3 className={styles.libraryTitle}>{item.title}</h3>
                <span className={[themeStyles.chip, themeStyles.chipMuted].join(" ")}>{item.category}</span>
              </header>

              <p className={styles.libraryDescription}>{item.description}</p>

              <ul className={styles.requirementList}>
                {item.requiredInputs.map((field) => (
                  <li className={styles.requirementItem} key={field.key}>
                    {field.label}
                    {field.required ? "*" : ""}
                  </li>
                ))}
              </ul>

              <button
                className={[themeStyles.button, themeStyles.buttonSecondary, themeStyles.buttonSm].join(" ")}
                onClick={() => {
                  initializeDraft(item);
                }}
                type="button"
              >
                Start playbook
              </button>
            </article>
          ))}
        </div>
      </Card>

      {selectedLibraryItem ? (
        <Card className={styles.stateCard} title={`Start: ${selectedLibraryItem.title}`}>
          <form className={styles.form} onSubmit={handleTrigger}>
            <label className={themeStyles.inputStack}>
              <span className={themeStyles.inputLabel}>Event title</span>
              <input
                className={themeStyles.inputControl}
                maxLength={120}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                }}
                required
                value={draftTitle}
              />
            </label>

            <div className={styles.formGrid}>
              {selectedLibraryItem.requiredInputs.map((field) => {
                const value = draftInputs[field.key] ?? "";

                if (field.type === "select") {
                  return (
                    <label className={themeStyles.inputStack} key={field.key}>
                      <span className={themeStyles.inputLabel}>{field.label}</span>
                      <select
                        className={themeStyles.inputControl}
                        onChange={(event) => {
                          setDraftInputs((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }));
                        }}
                        required={field.required}
                        value={value}
                      >
                        <option value="">Select</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                }

                return (
                  <label className={themeStyles.inputStack} key={field.key}>
                    <span className={themeStyles.inputLabel}>{field.label}</span>
                    <input
                      className={themeStyles.inputControl}
                      onChange={(event) => {
                        setDraftInputs((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }));
                      }}
                      placeholder={field.hint ?? undefined}
                      required={field.required}
                      type={field.type === "date" ? "date" : "text"}
                      value={value}
                    />
                  </label>
                );
              })}
            </div>

            {createError ? <p className={styles.errorText}>{createError}</p> : null}

            <div className={styles.formActions}>
              <button
                className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")}
                disabled={creating}
                type="submit"
              >
                {creating ? "Generating playbook..." : "Generate playbook"}
              </button>
              <button
                className={[themeStyles.button, themeStyles.buttonGhost].join(" ")}
                disabled={creating}
                onClick={() => {
                  setSelectedLibraryEventType(null);
                  setDraftTitle("");
                  setDraftInputs({});
                  setCreateError(null);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : null}
    </section>
  );
}
