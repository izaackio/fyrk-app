import type { InputHTMLAttributes } from "react";

import styles from "../theme/theme.module.css";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

export function InputField({ id, label, hint, error, ...props }: InputFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.inputStack}>
      <label className={styles.inputLabel} htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={styles.inputControl}
        id={id}
        {...props}
      />
      {hint ? (
        <span className={styles.inputHint} id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className={styles.inputError} id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
