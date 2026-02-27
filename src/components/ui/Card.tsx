import type { HTMLAttributes, ReactNode } from "react";

import styles from "../theme/theme.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: CardProps) {
  const classes = [styles.surfaceCard, className ?? ""].filter(Boolean).join(" ");

  return (
    <section className={classes} {...props}>
      {(title || description || actions) && (
        <header style={{ marginBottom: "12px" }}>
          {title ? <h2 style={{ margin: 0, fontSize: "1.125rem" }}>{title}</h2> : null}
          {description ? (
            <p style={{ color: "var(--co-text-secondary)", margin: "6px 0 0" }}>
              {description}
            </p>
          ) : null}
          {actions ? <div style={{ marginTop: "10px" }}>{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}
