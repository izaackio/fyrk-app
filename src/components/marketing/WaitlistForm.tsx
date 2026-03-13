"use client";

import { type FormEvent, useId, useState } from "react";

import { trackLandingEvent } from "@/components/marketing/analytics";

import styles from "./landing.module.css";

type FormValues = {
  name: string;
  email: string;
  householdContext: string;
};

type FieldErrors = {
  name?: string;
  email?: string;
  householdContext?: string;
};

type SubmissionState =
  | {
      kind: "idle";
      message?: never;
    }
  | {
      kind: "loading";
      message?: never;
    }
  | {
      kind: "success" | "duplicate" | "error";
      message: string;
    };

const submittedEmailStorageKey = "fyrk.waitlist.submitted-emails";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readSubmittedEmails(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(submittedEmailStorageKey);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function hasSubmittedEmail(email: string): boolean {
  const knownEmails = readSubmittedEmails();
  return knownEmails.includes(email);
}

function rememberSubmittedEmail(email: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const knownEmails = readSubmittedEmails();

  if (knownEmails.includes(email)) {
    return;
  }

  const nextEmails = [email, ...knownEmails].slice(0, 50);
  window.localStorage.setItem(submittedEmailStorageKey, JSON.stringify(nextEmails));
}

function getErrorMessage(response: Response, payload: unknown): string {
  if (isRecord(payload)) {
    const errorValue = payload.error;

    if (isRecord(errorValue)) {
      const apiMessage = getString(errorValue.message);

      if (apiMessage) {
        return apiMessage;
      }
    }
  }

  if (response.status === 429) {
    return "Too many attempts right now. Please wait a moment and try again.";
  }

  return "Could not submit right now. Please try again in a moment.";
}

function inferDuplicateFromSuccessPayload(payload: unknown): boolean | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.meta)) {
    const duplicateFromMeta = getBoolean(payload.meta.duplicate);

    if (typeof duplicateFromMeta === "boolean") {
      return duplicateFromMeta;
    }
  }

  if (!isRecord(payload.data)) {
    return null;
  }

  const duplicateFlag = getBoolean(payload.data.duplicate);

  if (typeof duplicateFlag === "boolean") {
    return duplicateFlag;
  }

  const createdFlag = getBoolean(payload.data.created);

  if (typeof createdFlag === "boolean") {
    return !createdFlag;
  }

  const status = getString(payload.data.status)?.toLowerCase();

  if (status === "duplicate") {
    return true;
  }

  if (status === "created" || status === "success") {
    return false;
  }

  const message = getString(payload.data.message)?.toLowerCase();

  if (message?.includes("already")) {
    return true;
  }

  return null;
}

function inferDuplicateFromErrorPayload(payload: unknown): boolean {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return false;
  }

  const message = getString(payload.error.message)?.toLowerCase() ?? "";
  return message.includes("already") || message.includes("duplicate") || message.includes("same unique");
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function validateForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};

  const normalizedName = values.name.trim();
  const normalizedEmail = normalizeEmail(values.email);

  if (normalizedName.length < 2) {
    errors.name = "Enter your name so we can personalize onboarding updates.";
  }

  if (!isValidEmail(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  if (values.householdContext.length > 280) {
    errors.householdContext = "Keep this note to 280 characters or fewer.";
  }

  return errors;
}

function hasValidationErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((error) => typeof error === "string");
}

export function WaitlistForm() {
  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    householdContext: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ kind: "idle" });

  const idPrefix = useId();
  const nameInputId = `${idPrefix}-name`;
  const emailInputId = `${idPrefix}-email`;
  const contextInputId = `${idPrefix}-context`;

  const isSubmitting = submissionState.kind === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextErrors = validateForm(values);
    setErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      setSubmissionState({ kind: "idle" });
      trackLandingEvent("waitlist_validation_error", {
        has_name_error: Boolean(nextErrors.name),
        has_email_error: Boolean(nextErrors.email),
        has_context_error: Boolean(nextErrors.householdContext),
      });
      return;
    }

    const normalizedEmail = normalizeEmail(values.email);
    const normalizedName = values.name.trim();
    const normalizedContext = values.householdContext.trim();
    const firstName = normalizedName.split(/\s+/)[0] ?? "there";
    const knownDuplicate = hasSubmittedEmail(normalizedEmail);

    setSubmissionState({ kind: "loading" });

    trackLandingEvent("waitlist_submit_attempt", {
      has_household_context: normalizedContext.length > 0,
    });

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const payload = await parseJsonSafely(response);

      if (response.ok) {
        rememberSubmittedEmail(normalizedEmail);

        const duplicate = inferDuplicateFromSuccessPayload(payload) ?? knownDuplicate;

        if (duplicate) {
          const message = "This email is already on the waitlist. We will send early-access updates here.";
          setSubmissionState({ kind: "duplicate", message });
          trackLandingEvent("waitlist_submit_duplicate", {
            source: "success_payload_or_local_cache",
          });
          return;
        }

        const message = `Thanks ${firstName}, you are on the waitlist. We will share early-access and onboarding updates by email.`;
        setSubmissionState({ kind: "success", message });
        setValues({
          name: "",
          email: "",
          householdContext: "",
        });
        trackLandingEvent("waitlist_submit_success", {
          has_household_context: normalizedContext.length > 0,
        });
        return;
      }

      if (inferDuplicateFromErrorPayload(payload)) {
        rememberSubmittedEmail(normalizedEmail);

        const message = "This email is already on the waitlist. We will send early-access updates here.";
        setSubmissionState({ kind: "duplicate", message });
        trackLandingEvent("waitlist_submit_duplicate", {
          source: "error_payload",
        });
        return;
      }

      const message = getErrorMessage(response, payload);
      setSubmissionState({ kind: "error", message });
      trackLandingEvent("waitlist_submit_error", {
        status: response.status,
      });
    } catch {
      const message = "Network issue while submitting. Please try again in a moment.";
      setSubmissionState({ kind: "error", message });
      trackLandingEvent("waitlist_submit_error", {
        status: "network",
      });
    }
  }

  function clearFieldError(field: keyof FieldErrors): void {
    if (!errors[field]) {
      return;
    }

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
  }

  return (
    <form className={styles.waitlistForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.fieldGrid}>
        <div className={styles.fieldBlock}>
          <label htmlFor={nameInputId} className={styles.label}>
            Name <span className={styles.requiredMarker}>*</span>
          </label>
          <input
            id={nameInputId}
            type="text"
            name="name"
            autoComplete="name"
            className={styles.input}
            value={values.name}
            onChange={(event) => {
              clearFieldError("name");
              setValues((currentValues) => ({
                ...currentValues,
                name: event.currentTarget.value,
              }));
            }}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameInputId}-error` : undefined}
            required
            disabled={isSubmitting}
          />
          {errors.name ? (
            <p id={`${nameInputId}-error`} className={styles.inlineError} role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className={styles.fieldBlock}>
          <label htmlFor={emailInputId} className={styles.label}>
            Email <span className={styles.requiredMarker}>*</span>
          </label>
          <input
            id={emailInputId}
            type="email"
            name="email"
            autoComplete="email"
            className={styles.input}
            value={values.email}
            onChange={(event) => {
              clearFieldError("email");
              setValues((currentValues) => ({
                ...currentValues,
                email: event.currentTarget.value,
              }));
            }}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${emailInputId}-error` : undefined}
            required
            disabled={isSubmitting}
          />
          {errors.email ? (
            <p id={`${emailInputId}-error`} className={styles.inlineError} role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className={styles.fieldBlock}>
        <label htmlFor={contextInputId} className={styles.label}>
          Household context (optional)
        </label>
        <textarea
          id={contextInputId}
          name="householdContext"
          className={styles.textarea}
          rows={4}
          maxLength={280}
          value={values.householdContext}
          onChange={(event) => {
            clearFieldError("householdContext");
            setValues((currentValues) => ({
              ...currentValues,
              householdContext: event.currentTarget.value,
            }));
          }}
          aria-invalid={Boolean(errors.householdContext)}
          aria-describedby={errors.householdContext ? `${contextInputId}-error` : `${contextInputId}-hint`}
          disabled={isSubmitting}
          placeholder="Example: We are planning a home purchase and want a shared monthly overview."
        />
        <p id={`${contextInputId}-hint`} className={styles.fieldHint}>
          Helps us prioritize onboarding and private demo invites.
        </p>
        {errors.householdContext ? (
          <p id={`${contextInputId}-error`} className={styles.inlineError} role="alert">
            {errors.householdContext}
          </p>
        ) : null}
      </div>

      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? "Joining early access..." : "Join early access"}
      </button>

      <p className={styles.privacyNote}>
        By joining, you agree to receive early-access updates from Fyrk. You can unsubscribe any time.
      </p>

      {submissionState.kind === "success" || submissionState.kind === "duplicate" || submissionState.kind === "error" ? (
        <p
          className={`${styles.feedback} ${
            submissionState.kind === "success"
              ? styles.feedbackSuccess
              : submissionState.kind === "duplicate"
                ? styles.feedbackDuplicate
                : styles.feedbackError
          }`}
          role="status"
          aria-live="polite"
        >
          {submissionState.message}
        </p>
      ) : null}
    </form>
  );
}
