"use client";

import { type FormEvent, useId, useState } from "react";

import { trackLandingEvent } from "@/components/marketing/analytics";

import styles from "./landing.module.css";

type FormValues = {
  email: string;
};

type FieldErrors = {
  email?: string;
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
  const normalizedEmail = normalizeEmail(values.email);

  if (!isValidEmail(normalizedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function hasValidationErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some((error) => typeof error === "string");
}

export function WaitlistForm() {
  const [values, setValues] = useState<FormValues>({
    email: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ kind: "idle" });

  const idPrefix = useId();
  const emailInputId = `${idPrefix}-email`;
  const isSubmitting = submissionState.kind === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const nextErrors = validateForm(values);
    setErrors(nextErrors);

    if (hasValidationErrors(nextErrors)) {
      setSubmissionState({ kind: "idle" });
      trackLandingEvent("waitlist_validation_error", {
        has_email_error: Boolean(nextErrors.email),
      });
      return;
    }

    const normalizedEmail = normalizeEmail(values.email);
    const knownDuplicate = hasSubmittedEmail(normalizedEmail);

    setSubmissionState({ kind: "loading" });
    trackLandingEvent("waitlist_submit_attempt");

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
          const message = "This email is already registered. We will use it for Fyrk demo and access updates.";
          setSubmissionState({ kind: "duplicate", message });
          trackLandingEvent("waitlist_submit_duplicate", {
            source: "success_payload_or_local_cache",
          });
          return;
        }

        const message = "You are on the list. We will follow up by email about private demos and early access.";
        setSubmissionState({ kind: "success", message });
        setValues({
          email: "",
        });
        trackLandingEvent("waitlist_submit_success");
        return;
      }

      if (inferDuplicateFromErrorPayload(payload)) {
        rememberSubmittedEmail(normalizedEmail);

        const message = "This email is already registered. We will use it for Fyrk demo and access updates.";
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

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  return (
    <form className={styles.waitlistForm} onSubmit={handleSubmit} noValidate>
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
            setValues({
              email: event.currentTarget.value,
            });
          }}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${emailInputId}-error` : `${emailInputId}-hint`}
          required
          disabled={isSubmitting}
          placeholder="you@household.com"
        />
        <p id={`${emailInputId}-hint`} className={styles.fieldHint}>
          We use this to coordinate private demos and early access invitations.
        </p>
        {errors.email ? (
          <p id={`${emailInputId}-error`} className={styles.inlineError} role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Request demo or early access"}
      </button>

      <p className={styles.privacyNote}>
        By submitting, you agree to receive a reply or launch updates from Fyrk. You can unsubscribe any time.
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
