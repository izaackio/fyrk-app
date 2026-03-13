import type { HTMLAttributes, ReactNode } from "react";

import styles from "../theme/theme.module.css";

type CardTone = "default" | "subtle";
type CardPadding = "default" | "compact" | "relaxed";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  tone?: CardTone;
  padding?: CardPadding;
}

export function Card({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  tone = "default",
  padding = "default",
  ...props
}: CardProps) {
  const toneClass = tone === "subtle" ? styles.surfaceCardSubtle : "";
  const paddingClass =
    padding === "compact"
      ? styles.surfaceCardCompact
      : padding === "relaxed"
        ? styles.surfaceCardRelaxed
        : "";

  const classes = [styles.surfaceCard, toneClass, paddingClass, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} {...props}>
      {(eyebrow || title || description || actions) && (
        <header className={styles.cardHeader}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitleBlock}>
              {eyebrow ? <span className={styles.cardEyebrow}>{eyebrow}</span> : null}
              {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
              {description ? <p className={styles.cardDescription}>{description}</p> : null}
            </div>
            {actions ? <div className={styles.cardActions}>{actions}</div> : null}
          </div>
        </header>
      )}
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}
