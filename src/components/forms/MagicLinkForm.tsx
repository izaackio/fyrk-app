"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { sendLoginMagicLink, sendSignupMagicLink } from "../api/mockClient";
import styles from "../theme/theme.module.css";
import { Button } from "../ui/Button";
import { InputField } from "../ui/InputField";

interface MagicLinkFormProps {
  mode: "login" | "signup";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MagicLinkForm({ mode }: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const copy = useMemo(
    () =>
      mode === "signup"
        ? {
            title: "Create your Fyrk account",
            subtitle: "Start with a secure magic link and set up your household.",
            action: "Send signup link",
            switchText: "Already have an account?",
            switchHref: "/login",
            switchLabel: "Sign in",
            nextHref: "/onboarding",
            nextLabel: "Continue to household setup",
          }
        : {
            title: "Welcome back",
            subtitle:
              "Sign in through magic link and continue with your household dashboard.",
            action: "Send login link",
            switchText: "New to Fyrk?",
            switchHref: "/signup",
            switchLabel: "Create account",
            nextHref: "/dashboard",
            nextLabel: "Continue to dashboard",
          },
    [mode],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address to continue.");
      return;
    }

    try {
      setSubmitting(true);
      const response =
        mode === "signup"
          ? await sendSignupMagicLink(email)
          : await sendLoginMagicLink(email);

      setNotice(response.data.message);
    } catch {
      setError("Unable to send magic link right now. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby={`magic-link-${mode}-title`}>
      <header className={styles.authHeader}>
        <h2 className={styles.authTitle} id={`magic-link-${mode}-title`}>
          {copy.title}
        </h2>
        <p className={styles.authSubtitle}>{copy.subtitle}</p>
      </header>

      <form className={styles.pageSection} noValidate onSubmit={handleSubmit}>
        <InputField
          autoComplete="email"
          id={`${mode}-email`}
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@household.com"
          type="email"
          value={email}
          error={error || undefined}
          hint="We only use your email for sign-in and household invites."
        />

        <Button block disabled={submitting} size="lg" type="submit">
          {submitting ? "Sending…" : copy.action}
        </Button>
      </form>

      {notice ? (
        <p
          className={[styles.chip, styles.chipPositive].join(" ")}
          role="status"
          style={{ marginTop: "16px" }}
        >
          {notice}
        </p>
      ) : null}

      {notice ? (
        <div style={{ marginTop: "16px" }}>
          <Link className={styles.link} href={copy.nextHref}>
            {copy.nextLabel}
          </Link>
        </div>
      ) : null}

      <p className={styles.authFooterLinks}>
        <span>{copy.switchText}</span>
        <Link className={styles.link} href={copy.switchHref}>
          {copy.switchLabel}
        </Link>
      </p>
    </section>
  );
}
