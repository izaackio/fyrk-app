import type { SelectHTMLAttributes } from "react";

import styles from "../theme/theme.module.css";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
}

export function SelectField({
  id,
  label,
  options,
  hint,
  error,
  className,
  ...props
}: SelectFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const selectClasses = [styles.selectControl, className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={styles.inputStack}>
      <label className={styles.inputLabel} htmlFor={id}>
        {label}
      </label>
      <select
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        className={selectClasses}
        id={id}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
