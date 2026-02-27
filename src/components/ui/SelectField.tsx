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
}

export function SelectField({
  id,
  label,
  options,
  hint,
  className,
  ...props
}: SelectFieldProps) {
  const selectClasses = [styles.inputControl, className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={styles.inputStack}>
      <label className={styles.inputLabel} htmlFor={id}>
        {label}
      </label>
      <select className={selectClasses} id={id} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className={styles.inputHint}>{hint}</span> : null}
    </div>
  );
}
