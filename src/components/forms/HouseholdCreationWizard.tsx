"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  completeOnboarding,
  createHousehold,
  inviteHouseholdMember,
} from "../api/mockClient";
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

export function HouseholdCreationWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [householdName, setHouseholdName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("SEK");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

      await completeOnboarding();
      setNotice("Household created and onboarding completed.");
      setStep(3);
    } catch {
      setError("Unable to complete setup right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeStepClass = (targetStep: WizardStep): string => {
    const activeClass = step === targetStep ? styles.wizardStepActive : "";
    return [styles.wizardStep, activeClass].filter(Boolean).join(" ");
  };

  return (
    <section className={styles.wizard}>
      <div className={styles.wizardSteps}>
        <article className={completeStepClass(1)}>
          <span className={styles.wizardStepLabel}>Step 1</span>
          <strong className={styles.wizardStepMeta}>Household basics</strong>
        </article>
        <article className={completeStepClass(2)}>
          <span className={styles.wizardStepLabel}>Step 2</span>
          <strong className={styles.wizardStepMeta}>Invite partner</strong>
        </article>
        <article className={completeStepClass(3)}>
          <span className={styles.wizardStepLabel}>Step 3</span>
          <strong className={styles.wizardStepMeta}>Launch dashboard</strong>
        </article>
      </div>

      {step === 1 ? (
        <Card
          description="Create your shared household before adding accounts in Sprint 2."
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
          description="Invites are optional and can be sent later from household settings."
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
              hint="This maps to POST /api/households/:id/invite."
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
          description="Your app shell is active. Account and import flows arrive in Sprint 2."
          title="You are ready"
        >
          <div className={styles.pageSection}>
            <p className={styles.wizardMeta}>
              Household setup complete. Continue to your placeholder dashboard.
            </p>
            <Button onClick={() => router.push("/dashboard")} size="lg">
              Open dashboard
            </Button>
          </div>
        </Card>
      ) : null}

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
    </section>
  );
}
