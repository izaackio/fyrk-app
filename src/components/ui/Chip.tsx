import type { HTMLAttributes, ReactNode } from "react";

import styles from "../theme/theme.module.css";

type ChipTone = "neutral" | "positive" | "warning" | "info";
type ChipSize = "sm" | "md";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone;
  size?: ChipSize;
  children: ReactNode;
}

const toneStyles: Record<ChipTone, string> = {
  neutral: styles.chipMuted ?? "",
  positive: styles.chipPositive ?? "",
  warning: styles.chipWarning ?? "",
  info: styles.chipInfo ?? ""
};

const sizeStyles: Record<ChipSize, string> = {
  sm: styles.chipSm ?? "",
  md: styles.chipMd ?? ""
};

export function Chip({ tone = "neutral", size = "md", className, children, ...props }: ChipProps) {
  const classes = [styles.chip, toneStyles[tone], sizeStyles[size], className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
