import type { ReactNode } from "react";

import styles from "../theme/theme.module.css";
import { Card } from "./Card";

type RouteStateTone = "default" | "info" | "warning";

interface RouteStateProps {
  title: string;
  description: string;
  actions?: ReactNode;
  children?: ReactNode;
  busy?: boolean;
  tone?: RouteStateTone;
}

const toneClassNames: Record<RouteStateTone, string> = {
  default: styles.noticeCard ?? "",
  info: [styles.noticeCard, styles.noticeCardInfo].filter(Boolean).join(" "),
  warning: [styles.noticeCard, styles.noticeCardWarning].filter(Boolean).join(" "),
};

export function RouteState({
  title,
  description,
  actions,
  children,
  busy = false,
  tone = "default",
}: RouteStateProps) {
  return (
    <Card className={toneClassNames[tone]} title={title} description={description}>
      <div aria-busy={busy} className={styles.noticeStack}>
        {children ? <div>{children}</div> : null}
        {actions ? <div className={styles.noticeActions}>{actions}</div> : null}
      </div>
    </Card>
  );
}
