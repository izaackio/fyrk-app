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
        <header className={styles.cardHeader}>
          <div className={styles.cardHeading}>
            {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
            {description ? <p className={styles.cardDescription}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.cardActions}>{actions}</div> : null}
        </header>
      )}
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}
