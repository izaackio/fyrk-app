"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDate, formatMoney, formatNumber, formatPercent } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import type { LifeEvent, PlaybookAction, PlaybookActionStatus } from "../sprint4/contracts";
import { ApiClientError } from "../sprint4/http";
import themeStyles from "../theme/theme.module.css";
import { Card } from "../ui/Card";
import { getLifeEvent, updatePlaybookAction } from "./client";
import styles from "./events.module.css";

const describeError = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load this playbook. Try again.";
};

const priorityClassByValue: Record<PlaybookAction["priority"], string> = {
  critical: styles.priorityCritical ?? "",
  high: styles.priorityHigh ?? "",
  low: styles.priorityLow ?? "",
  medium: styles.priorityMedium ?? "",
};

const statusClassByValue: Record<PlaybookAction["status"], string> = {
  completed: styles.statusCompleted ?? "",
  pending: styles.statusPending ?? "",
  skipped: styles.statusSkipped ?? "",
};

const toAssigneeSelectValue = (
  action: PlaybookAction,
  currentActorId: string,
): string => {
  if (!action.assignedTo) {
    return "unassigned";
  }

  if (action.assignedTo === currentActorId) {
    return "self";
  }

  return "partner";
};

interface EventDetailExperienceProps {
  eventId: string;
}

export function EventDetailExperience({ eventId }: EventDetailExperienceProps) {
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

  const [eventItem, setEventItem] = useState<LifeEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!activeHouseholdId) {
      setEventItem(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getLifeEvent({
        actor,
        householdId: activeHouseholdId,
        id: eventId,
      });

      setEventItem(response.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId, actor, eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  const handleUpdateAction = async ({
    action,
    assignedTo,
    assignedToLabel,
    status,
  }: {
    action: PlaybookAction;
    assignedTo?: string | null;
    assignedToLabel?: string | null;
    status?: PlaybookActionStatus;
  }) => {
    if (!activeHouseholdId) {
      return;
    }

    setUpdatingActionId(action.id);
    setUpdateError(null);

    try {
      const response = await updatePlaybookAction({
        actionId: action.id,
        actor,
        eventId,
        householdId: activeHouseholdId,
        payload: {
          ...(assignedTo !== undefined ? { assignedTo } : {}),
          ...(assignedToLabel !== undefined ? { assignedToLabel } : {}),
          ...(status !== undefined ? { status } : {}),
        },
      });

      setEventItem(response.data);
    } catch (requestError) {
      setUpdateError(describeError(requestError));
    } finally {
      setUpdatingActionId(null);
    }
  };

  if (householdLoading) {
    return (
      <Card className={styles.stateCard} title="Loading event playbook">
        <p className={styles.stateMessage}>Fetching household context and playbook details...</p>
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
        <p className={styles.stateMessage}>Create a household to unlock playbook detail views.</p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/onboarding">
          Continue onboarding
        </Link>
      </Card>
    );
  }

  if (loading && !eventItem) {
    return (
      <Card className={styles.stateCard} title="Loading event playbook">
        <p className={styles.stateMessage}>Building checklist, assignments, and impact summary...</p>
      </Card>
    );
  }

  if (error && !eventItem) {
    return (
      <Card className={styles.stateCard} title="Could not load event playbook">
        <p className={styles.errorText}>{error}</p>
        <div className={styles.formActions}>
          <button
            className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
            onClick={() => {
              void loadEvent();
            }}
            type="button"
          >
            Retry
          </button>
          <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/events">
            Back to events
          </Link>
        </div>
      </Card>
    );
  }

  if (!eventItem) {
    return (
      <Card className={styles.stateCard} title="Playbook not found">
        <p className={styles.stateMessage}>This life event does not exist in your household history.</p>
        <Link className={[themeStyles.button, themeStyles.buttonPrimary].join(" ")} href="/events">
          Back to events
        </Link>
      </Card>
    );
  }

  const completionPct = eventItem.progress.pct;

  return (
    <section className={styles.stack}>
      <Card className={styles.stateCard}>
        <header className={styles.eventHeader}>
          <div>
            <h2 className={styles.eventTitle}>{eventItem.title}</h2>
            <p className={styles.eventMeta}>
              {eventItem.targetDate
                ? `Target date ${formatDate(eventItem.targetDate)}`
                : "No target date"}
            </p>
          </div>

          <span
            className={[
              themeStyles.chip,
              eventItem.status === "completed"
                ? themeStyles.chipPositive
                : themeStyles.chipMuted,
            ].join(" ")}
          >
            {eventItem.status}
          </span>
        </header>

        <p className={styles.eventSummary}>{eventItem.impactSummary}</p>

        <div className={styles.progressWrap}>
          <div aria-hidden className={styles.progressBar}>
            <span className={styles.progressValue} style={{ width: `${completionPct}%` }} />
          </div>
          <p className={styles.progressLabel}>
            {eventItem.progress.completed + eventItem.progress.skipped}/{eventItem.progress.total} actions resolved
          </p>
        </div>

        <div className={styles.impactGrid}>
          <article className={styles.impactCard}>
            <p className={styles.impactLabel}>Down payment</p>
            <p className={styles.impactValue}>
              {eventItem.impactData.downPaymentRequired === null
                ? "-"
                : formatMoney(eventItem.impactData.downPaymentRequired, "SEK")}
            </p>
          </article>
          <article className={styles.impactCard}>
            <p className={styles.impactLabel}>Monthly housing cost</p>
            <p className={styles.impactValue}>
              {eventItem.impactData.monthlyMortgageCost === null
                ? "-"
                : formatMoney(eventItem.impactData.monthlyMortgageCost, "SEK")}
            </p>
          </article>
          <article className={styles.impactCard}>
            <p className={styles.impactLabel}>Net-worth effect</p>
            <p className={styles.impactValue}>
              {eventItem.impactData.netWorthImpactPct === null
                ? "-"
                : formatPercent(eventItem.impactData.netWorthImpactPct)}
            </p>
          </article>
          <article className={styles.impactCard}>
            <p className={styles.impactLabel}>Fitness score effect</p>
            <p className={styles.impactValue}>
              {eventItem.impactData.fitnessScoreImpact === null
                ? "-"
                : formatNumber(eventItem.impactData.fitnessScoreImpact, 0)}
            </p>
          </article>
        </div>
      </Card>

      {updateError ? (
        <Card className={styles.stateCard} title="Could not update action">
          <p className={styles.errorText}>{updateError}</p>
        </Card>
      ) : null}

      <Card className={styles.stateCard} title="Playbook checklist">
        <div className={styles.actionList}>
          {eventItem.playbook.actions.map((action) => {
            const assigneeValue = toAssigneeSelectValue(action, actor.id);

            return (
              <article className={styles.actionCard} key={action.id}>
                <header className={styles.actionHeader}>
                  <div>
                    <h3 className={styles.actionTitle}>{action.title}</h3>
                    <p className={styles.actionDescription}>{action.description}</p>
                  </div>

                  <div className={styles.actionBadges}>
                    <span className={[styles.priorityBadge, priorityClassByValue[action.priority]].join(" ")}>
                      {action.priority}
                    </span>
                    <span className={[styles.statusBadge, statusClassByValue[action.status]].join(" ")}>
                      {action.status}
                    </span>
                  </div>
                </header>

                <p className={styles.impactNote}>{action.estimatedImpactDescription}</p>

                <div className={styles.actionControls}>
                  <label className={themeStyles.inputStack}>
                    <span className={themeStyles.inputLabel}>Assign to</span>
                    <select
                      className={themeStyles.inputControl}
                      disabled={updatingActionId === action.id}
                      onChange={(changeEvent) => {
                        const value = changeEvent.target.value;

                        if (value === "self") {
                          void handleUpdateAction({
                            action,
                            assignedTo: actor.id,
                            assignedToLabel: actor.displayName,
                          });
                          return;
                        }

                        if (value === "partner") {
                          void handleUpdateAction({
                            action,
                            assignedTo: "partner-member",
                            assignedToLabel: "Partner",
                          });
                          return;
                        }

                        void handleUpdateAction({
                          action,
                          assignedTo: null,
                          assignedToLabel: null,
                        });
                      }}
                      value={assigneeValue}
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="self">{actor.displayName}</option>
                      <option value="partner">Partner</option>
                    </select>
                  </label>

                  <div className={styles.actionButtons}>
                    <button
                      className={[themeStyles.button, themeStyles.buttonPrimary, themeStyles.buttonSm].join(" ")}
                      disabled={updatingActionId === action.id}
                      onClick={() => {
                        void handleUpdateAction({
                          action,
                          status: action.status === "completed" ? "pending" : "completed",
                        });
                      }}
                      type="button"
                    >
                      {action.status === "completed" ? "Reopen" : "Mark complete"}
                    </button>
                    <button
                      className={[themeStyles.button, themeStyles.buttonGhost, themeStyles.buttonSm].join(" ")}
                      disabled={updatingActionId === action.id}
                      onClick={() => {
                        void handleUpdateAction({
                          action,
                          status: action.status === "skipped" ? "pending" : "skipped",
                        });
                      }}
                      type="button"
                    >
                      {action.status === "skipped" ? "Unskip" : "Skip"}
                    </button>
                  </div>
                </div>

                <footer className={styles.actionFooter}>
                  <span className={styles.subtleLabel}>
                    {action.dueDate ? `Due ${formatDate(action.dueDate)}` : "No due date"}
                  </span>
                  <span className={styles.subtleLabel}>
                    {action.assignedToLabel ? `Assigned to ${action.assignedToLabel}` : "Not assigned"}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      </Card>

      <Card className={styles.stateCard} title="Related views">
        <div className={styles.formActions}>
          <Link className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")} href="/timeline">
            Open timeline
          </Link>
          <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/fitness">
            Open fitness score
          </Link>
          <Link className={[themeStyles.button, themeStyles.buttonGhost].join(" ")} href="/events">
            Back to events
          </Link>
        </div>
      </Card>
    </section>
  );
}
