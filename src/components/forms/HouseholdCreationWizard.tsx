"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DEMO_VARIANT_OPTIONS } from "../api/demo-options";
import { createHousehold, inviteHouseholdMember } from "../api/mockClient";
import type { DemoInitialization, DemoVariant } from "../api/contracts";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import styles from "../theme/theme.module.css";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { InputField } from "../ui/InputField";
import { SelectField } from "../ui/SelectField";

const CURRENCIES = [
  { value: "SEK", label: "SEK (Swedish Krona)" },
  { value: "EUR", label: "EUR (Euro)" },
  { value: "USD", label: "USD (US Dollar)" },
  { value: "NOK", label: "NOK (Norwegian Krone)" },
  { value: "DKK", label: "DKK (Danish Krone)" },
];

const INVITE_ROLES = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WizardStep = 1 | 2 | 3;

const getStepState = (
  targetStep: WizardStep,
  activeStep: WizardStep,
  isComplete: boolean,
): string => {
  if (isComplete || activeStep > targetStep) {
    return styles.wizardStepComplete ?? "";
  }

  if (activeStep === targetStep) {
    return styles.wizardStepActive ?? "";
  }

  return styles.wizardStepPending ?? "";
};

export function HouseholdCreationWizard() {
  const router = useRouter();
  const {
    activeHousehold,
    demoError,
    demoLoading,
    onboardingState,
    realHouseholds,
    refreshSession,
    startDemo,
  } = useHouseholdContext();
  const [step, setStep] = useState<WizardStep>(1);
  const [householdName, setHouseholdName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("SEK");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [selectedDemoVariant, setSelectedDemoVariant] = useState<DemoVariant>("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [demoSummary, setDemoSummary] = useState<DemoInitialization | null>(null);
  const [completionSummary, setCompletionSummary] = useState<{
    householdName: string;
    inviteMessage: string;
  } | null>(null);

  const hasRealHousehold = realHouseholds.length > 0;
  const effectiveStep: WizardStep = hasRealHousehold ? 3 : step;
  const selectedDemoOption = useMemo(
    () => DEMO_VARIANT_OPTIONS.find((option) => option.value === selectedDemoVariant),
    [selectedDemoVariant],
  );

  const resetMessages = () => {
    setError("");
    setNotice("");
  };

  const handleNext = () => {
    resetMessages();

    if (!householdName.trim()) {
      setError("Household name is required.");
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    resetMessages();
    setStep(1);
  };

  const handleSubmit = async () => {
    resetMessages();

    if (inviteEmail && !EMAIL_PATTERN.test(inviteEmail)) {
      setError("Enter a valid invite email or leave it blank to skip.");
      return;
    }

    try {
      setSubmitting(true);

      const householdResponse = await createHousehold({
        name: householdName.trim(),
        baseCurrency,
      });

      if (inviteEmail) {
        await inviteHouseholdMember(householdResponse.data.id, {
          email: inviteEmail.trim(),
          role: inviteRole,
        });
      }

      await refreshSession(householdResponse.data.id);
      setCompletionSummary({
        householdName: householdResponse.data.name,
        inviteMessage: inviteEmail
          ? `Partner invite sent to ${inviteEmail.trim()} as ${inviteRole}.`
          : "Partner invite skipped for now.",
      });
      setNotice("Household created. You are now using your own household data.");
      setStep(3);
    } catch {
      setError("Unable to complete setup right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDemo = async () => {
    resetMessages();

    try {
      const summary = await startDemo(selectedDemoVariant);
      setDemoSummary(summary);
      setNotice(`Demo ready: ${summary.name}. You can switch back to real data from the selector.`);
    } catch {
      setError("Unable to launch the demo right now. Please try again.");
    }
  };

  return (
    <section className={styles.onboardingLayout}>
      <div className={styles.onboardingMain}>
        <div className={styles.wizardSteps}>
          {[1, 2, 3].map((item) => {
            const targetStep = item as WizardStep;
            const stateClass = getStepState(targetStep, effectiveStep, hasRealHousehold);
            const statusLabel =
              hasRealHousehold || effectiveStep > targetStep
                ? "Done"
                : effectiveStep === targetStep
                  ? "Current"
                  : "Next";

            return (
              <article className={[styles.wizardStep, stateClass].join(" ")} key={targetStep}>
                <span className={styles.wizardStepLabel}>Step {targetStep}</span>
                <strong className={styles.wizardStepMeta}>
                  {targetStep === 1
                    ? "Choose your start"
                    : targetStep === 2
                      ? "Create and invite"
                      : "Launch dashboard"}
                </strong>
                <span className={styles.wizardStepStatus}>{statusLabel}</span>
              </article>
            );
          })}
        </div>

        <Card
          description="Pick the fastest path for the demo: try guided sample data first, or create your own household immediately."
          title="Choose how to begin"
        >
          <div className={styles.choiceGrid}>
            <article className={styles.choiceCard}>
              <span className={[styles.chip, styles.chipMuted].join(" ")}>Demo first</span>
              <h3 className={styles.choiceTitle}>Explore the product with sample data</h3>
              <p className={styles.choiceBody}>
                Launch a guided demo household in read-only mode so you can show the main
                routes before connecting real data.
              </p>
            </article>
            <article className={styles.choiceCard}>
              <span className={[styles.chip, styles.chipPositive].join(" ")}>Real setup</span>
              <h3 className={styles.choiceTitle}>Create your own household</h3>
              <p className={styles.choiceBody}>
                Add the household name, choose a base currency, and optionally send the
                partner invite now.
              </p>
            </article>
          </div>
        </Card>

        {hasRealHousehold ? (
          <Card
            description="Real household setup is complete. Demo access stays available from the top selector whenever you need it."
            title="Onboarding complete"
          >
            <div className={styles.pageSection}>
              <p className={styles.wizardMeta}>
                Household: <strong>{completionSummary?.householdName ?? realHouseholds[0]?.name}</strong>
              </p>
              <p className={styles.wizardMeta}>
                {completionSummary?.inviteMessage ?? "Your household is ready for accounts, imports, and weekly summaries."}
              </p>
              <div className={styles.noticeActions}>
                <Button onClick={() => router.push("/dashboard")} size="lg">
                  Open dashboard
                </Button>
                <Button
                  onClick={() => router.push("/accounts/new")}
                  size="lg"
                  variant="secondary"
                >
                  Add first account
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {step === 1 ? (
              <Card
                description="Start with the household basics. You can invite your partner in the next step."
                title="Household details"
              >
                <div className={styles.pageSection}>
                  <InputField
                    id="household-name"
                    label="Household name"
                    onChange={(event) => setHouseholdName(event.target.value)}
                    placeholder="Andersson Household"
                    value={householdName}
                  />
                  <SelectField
                    id="household-currency"
                    label="Base currency"
                    onChange={(event) => setBaseCurrency(event.target.value)}
                    options={CURRENCIES}
                    value={baseCurrency}
                  />
                </div>
              </Card>
            ) : null}

            {step === 2 ? (
              <Card
                description="Invites are optional and can be sent later from the household area."
                title="Invite your partner (optional)"
              >
                <div className={styles.pageSection}>
                  <InputField
                    id="invite-email"
                    label="Partner email"
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="partner@example.com"
                    type="email"
                    value={inviteEmail}
                    hint="This will send the same invite flow used by the household API."
                  />
                  <SelectField
                    id="invite-role"
                    label="Role"
                    onChange={(event) =>
                      setInviteRole(event.target.value as "member" | "admin")
                    }
                    options={INVITE_ROLES}
                    value={inviteRole}
                  />
                  <Card className={styles.placeholder} title="Review">
                    <p className={styles.wizardMeta}>
                      Household: <strong>{householdName}</strong>
                    </p>
                    <p className={styles.wizardMeta}>Base currency: {baseCurrency}</p>
                    <p className={styles.wizardMeta}>
                      Invite: {inviteEmail ? `${inviteEmail} (${inviteRole})` : "Skipped"}
                    </p>
                  </Card>
                </div>
              </Card>
            ) : null}

            {step === 3 ? (
              <Card
                description="Your app shell is ready. Demo scenarios remain available from the selector if you need sample data again."
                title="You are ready"
              >
                <div className={styles.pageSection}>
                  <p className={styles.wizardMeta}>
                    Household setup complete. Continue to the dashboard or add your first
                    account.
                  </p>
                  <div className={styles.noticeActions}>
                    <Button onClick={() => router.push("/dashboard")} size="lg">
                      Open dashboard
                    </Button>
                    <Button
                      onClick={() => router.push("/accounts/new")}
                      size="lg"
                      variant="secondary"
                    >
                      Add first account
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}

            {step < 3 ? (
              <div className={styles.wizardActions}>
                <div>
                  {step === 2 ? (
                    <Button onClick={handleBack} variant="secondary">
                      Back
                    </Button>
                  ) : null}
                </div>
                <div>
                  {step === 1 ? (
                    <Button onClick={handleNext}>Continue</Button>
                  ) : (
                    <Button disabled={submitting} onClick={handleSubmit}>
                      {submitting ? "Creating…" : "Create household"}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <p className={[styles.chip, styles.chipWarning].join(" ")} role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className={[styles.chip, styles.chipPositive].join(" ")} role="status">
            {notice}
          </p>
        ) : null}
      </div>

      <aside className={styles.onboardingAside}>
        <Card
          description="Demo scenarios stay read-only and safe to explore. When you are ready, create your real household and switch over from the selector."
          title="Launch a guided demo"
        >
          <div className={styles.pageSection}>
            <SelectField
              id="demo-variant"
              label="Demo scenario"
              onChange={(event) => setSelectedDemoVariant(event.target.value as DemoVariant)}
              options={DEMO_VARIANT_OPTIONS.map((option) => ({
                label: option.label,
                value: option.value,
              }))}
              value={selectedDemoVariant}
              {...(selectedDemoOption ? { hint: selectedDemoOption.description } : {})}
            />
            <Button disabled={demoLoading} onClick={handleStartDemo} variant="secondary">
              {demoLoading ? "Launching demo…" : "Launch demo"}
            </Button>
          </div>
        </Card>

        {demoSummary ? (
          <Card
            description="The demo is active in the app shell now."
            title={`${demoSummary.name} ready`}
          >
            <ul className={styles.list}>
              <li className={styles.listItem}>{demoSummary.memberCount} household members</li>
              <li className={styles.listItem}>{demoSummary.accountCount} accounts</li>
              <li className={styles.listItem}>{demoSummary.timelineEntries} timeline entries</li>
            </ul>
          </Card>
        ) : null}

        {onboardingState === "demo_ready" && !hasRealHousehold ? (
          <Card
            description="You are currently exploring a guided demo. Real household setup is still pending."
            title="Demo active"
          >
            <p className={styles.wizardMeta}>
              {activeHousehold?.isDemo
                ? `${activeHousehold.name} is selected in the app shell.`
                : "A demo household is active and available from the top selector."}
            </p>
          </Card>
        ) : null}

        {demoError ? (
          <p className={[styles.chip, styles.chipWarning].join(" ")} role="alert">
            {demoError}
          </p>
        ) : null}

        <Card
          description="These are the moments users need to feel that setup is finished."
          title="Completion checklist"
        >
          <ul className={styles.list}>
            <li className={styles.listItem}>A household or demo is selected in the shell.</li>
            <li className={styles.listItem}>The next best action is obvious.</li>
            <li className={styles.listItem}>Switching from demo to real data takes one tap.</li>
          </ul>
        </Card>
      </aside>
    </section>
  );
}
