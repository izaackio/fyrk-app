"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { formatDate } from "../accounts/formatters";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import { inviteHouseholdMember } from "../api/mockClient";
import type { HouseholdRole } from "../api/contracts";
import styles from "../theme/theme.module.css";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { InputField } from "../ui/InputField";
import { SelectField } from "../ui/SelectField";
import { RouteState } from "../ui/RouteState";
import {
  loadHouseholdWorkspace,
  type HouseholdWorkspaceData,
} from "./client";
import workspaceStyles from "./household-workspace.module.css";

const INVITE_ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
];

const STATUS_TONE_CLASS: Record<"active" | "invited", string> = {
  active: [styles.chip, styles.chipPositive].join(" "),
  invited: [styles.chip, styles.chipMuted].join(" "),
};

const ROLE_COPY: Record<HouseholdRole, string> = {
  admin: "Can help manage members and coordination.",
  member: "Can collaborate on household decisions.",
  owner: "Owns access and key household settings.",
  viewer: "Can stay informed without editing.",
};

const describeError = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not load the household workspace right now.";
};

const formatJoinedDate = (value: string | null): string =>
  value ? formatDate(value) : "Recently added";

export function HouseholdWorkspace() {
  const {
    activeHousehold,
    activeHouseholdId,
    error: householdError,
    hasRealHouseholds,
    loading: householdLoading,
    refreshSession,
  } = useHouseholdContext();

  const [workspace, setWorkspace] = useState<HouseholdWorkspaceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteError, setInviteError] = useState<string>("");
  const [inviteNotice, setInviteNotice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!activeHouseholdId) {
      setWorkspace(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await loadHouseholdWorkspace(activeHouseholdId);
      setWorkspace(response.data);
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeHouseholdId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const collaborationSummary = useMemo(
    () => [
      `${workspace?.members.filter((member) => member.status === "active").length ?? 0} active member${
        (workspace?.members.filter((member) => member.status === "active").length ?? 0) === 1
          ? ""
          : "s"
      }`,
      `${workspace?.members.filter((member) => member.status === "invited").length ?? 0} invite${
        (workspace?.members.filter((member) => member.status === "invited").length ?? 0) === 1
          ? ""
          : "s"
      } pending`,
    ].join(" · "),
    [workspace],
  );

  const handleInviteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeHouseholdId) {
      return;
    }

    setInviteError("");
    setInviteNotice("");
    setSubmitting(true);

    try {
      const email = inviteEmail.trim();
      if (!email) {
        throw new Error("Invite email is required.");
      }

      await inviteHouseholdMember(activeHouseholdId, {
        email,
        role: inviteRole,
      });

      await Promise.all([refreshSession(activeHouseholdId), loadWorkspace()]);
      setInviteNotice(`Invitation sent to ${email}.`);
      setInviteEmail("");
      setInviteRole("member");
    } catch (requestError) {
      setInviteError(describeError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (householdLoading) {
    return (
      <Card className={workspaceStyles.stateCard} title="Loading household workspace">
        <p className={workspaceStyles.stateMessage}>
          Preparing members, invite status, and household coordination settings...
        </p>
      </Card>
    );
  }

  if (householdError) {
    return (
      <Card className={workspaceStyles.stateCard} title="Could not load household">
        <p className={workspaceStyles.errorText}>{householdError}</p>
      </Card>
    );
  }

  if (!activeHouseholdId || !hasRealHouseholds || activeHousehold?.isDemo) {
    return (
      <section className={workspaceStyles.stack}>
        <RouteState
          description="Demo households stay read-only. Create your own household to invite a partner, set ownership, and keep collaboration history in one place."
          title="Household coordination unlocks on real data"
          tone="info"
        />
        <Card className={workspaceStyles.stateCard} title="What this route manages">
          <ul className={workspaceStyles.protocolList}>
            <li>Invite a partner or advisor into the same decision loop.</li>
            <li>Keep ownership roles clear across proposals, reviews, and imports.</li>
            <li>Use one shared base currency and one shared operating rhythm.</li>
          </ul>
        </Card>
      </section>
    );
  }

  return (
    <section className={workspaceStyles.stack}>
      <RouteState
        description="Household ownership, invite flow, and collaboration norms now live here as a full workspace."
        title={workspace ? `${workspace.name} collaboration` : "Household collaboration"}
        tone="info"
      >
        <p className={workspaceStyles.routeNarrative}>
          Keep the operational layer calm: roles stay explicit, invitations stay visible,
          and both partners can see how decisions move through the product.
        </p>
      </RouteState>

      {error ? (
        <Card className={workspaceStyles.stateCard} title="Refresh issue">
          <p className={workspaceStyles.errorText}>{error}</p>
        </Card>
      ) : null}

      <div className={workspaceStyles.heroGrid}>
        <Card className={workspaceStyles.metricCard}>
          <span className={workspaceStyles.metricLabel}>Active household</span>
          <strong className={workspaceStyles.metricValue}>
            {workspace?.name ?? activeHousehold?.name ?? "Your household"}
          </strong>
          <span className={workspaceStyles.metricMeta}>{collaborationSummary}</span>
        </Card>
        <Card className={workspaceStyles.metricCard}>
          <span className={workspaceStyles.metricLabel}>Your access</span>
          <strong className={workspaceStyles.metricValue}>{activeHousehold?.role ?? "owner"}</strong>
          <span className={workspaceStyles.metricMeta}>
            {ROLE_COPY[activeHousehold?.role ?? "owner"]}
          </span>
        </Card>
        <Card className={workspaceStyles.metricCard}>
          <span className={workspaceStyles.metricLabel}>Base currency</span>
          <strong className={workspaceStyles.metricValue}>{workspace?.baseCurrency ?? "SEK"}</strong>
          <span className={workspaceStyles.metricMeta}>
            Shared across balance sheet, reviews, and exports.
          </span>
        </Card>
        <Card className={workspaceStyles.metricCard}>
          <span className={workspaceStyles.metricLabel}>Created</span>
          <strong className={workspaceStyles.metricValue}>
            {workspace?.createdAt ? formatDate(workspace.createdAt) : "This session"}
          </strong>
          <span className={workspaceStyles.metricMeta}>
            Household history continues from onboarding and future invites.
          </span>
        </Card>
      </div>

      <div className={workspaceStyles.layoutGrid}>
        <Card
          className={workspaceStyles.rosterCard}
          title="Member roster"
          description="Active members and open invitations for the current household."
        >
          {loading && !workspace ? (
            <p className={workspaceStyles.stateMessage}>Loading household members...</p>
          ) : null}

          {workspace?.members.length ? (
            <ul className={workspaceStyles.memberList}>
              {workspace.members.map((member) => (
                <li className={workspaceStyles.memberRow} key={member.id}>
                  <div className={workspaceStyles.memberBody}>
                    <div className={workspaceStyles.memberHeading}>
                      <h3 className={workspaceStyles.memberName}>{member.displayName}</h3>
                      <div className={workspaceStyles.memberBadges}>
                        <span className={STATUS_TONE_CLASS[member.status]}>{member.status}</span>
                        <span className={[styles.chip, styles.chipMuted].join(" ")}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                    <p className={workspaceStyles.memberMeta}>
                      {member.email ?? "No contact email available"}
                    </p>
                  </div>
                  <p className={workspaceStyles.memberSecondary}>
                    {member.status === "active"
                      ? `Joined ${formatJoinedDate(member.joinedAt)}`
                      : "Invite pending acceptance"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={workspaceStyles.stateMessage}>
              No members loaded yet. Send the first invite to bring someone into the workspace.
            </p>
          )}
        </Card>

        <div className={workspaceStyles.sideStack}>
          <Card
            className={workspaceStyles.inviteCard}
            title="Invite collaborator"
            description="Invite a partner, co-owner, or advisor without leaving the app shell."
          >
            <form className={workspaceStyles.inviteForm} onSubmit={handleInviteSubmit}>
              <InputField
                autoComplete="email"
                id="household-invite-email"
                label="Email"
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                }}
                placeholder="partner@example.com"
                type="email"
                value={inviteEmail}
                {...(inviteError ? { error: inviteError } : {})}
              />
              <SelectField
                id="household-invite-role"
                label="Role"
                onChange={(event) => {
                  setInviteRole(event.target.value as "admin" | "member" | "viewer");
                }}
                options={INVITE_ROLE_OPTIONS}
                value={inviteRole}
              />
              {inviteNotice ? (
                <p className={workspaceStyles.successText} role="status">
                  {inviteNotice}
                </p>
              ) : null}
              <Button disabled={submitting} type="submit" variant="primary">
                {submitting ? "Sending invite..." : "Send invite"}
              </Button>
            </form>
          </Card>

          <Card
            className={workspaceStyles.protocolCard}
            title="Operating rhythm"
            description="A calm household finance product still needs explicit expectations."
          >
            <ul className={workspaceStyles.protocolList}>
              <li>Use proposals for decisions that change allocation, cash flow, or liabilities.</li>
              <li>Use the timeline for context, not just conclusions, so future reviews remain legible.</li>
              <li>Keep one owner accountable for imports and one partner accountable for approvals.</li>
            </ul>
          </Card>
        </div>
      </div>
    </section>
  );
}
