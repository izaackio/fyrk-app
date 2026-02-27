import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "../theme/theme.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary ?? "",
  secondary: styles.buttonSecondary ?? "",
  ghost: styles.buttonGhost ?? "",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: styles.buttonSm ?? "",
  md: styles.buttonMd ?? "",
  lg: styles.buttonLg ?? "",
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    variantStyles[variant],
    sizeStyles[size],
    block ? styles.buttonBlock : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
