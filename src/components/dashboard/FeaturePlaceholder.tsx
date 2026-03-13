import type { ReactNode } from "react";

import styles from "../theme/theme.module.css";
import { Card } from "../ui/Card";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  children?: ReactNode;
  detail?: string;
}

export function FeaturePlaceholder({
  title,
  description,
  children,
  detail = "This route is connected in the launch shell and is using a focused placeholder while the underlying workflows continue to expand.",
}: FeaturePlaceholderProps) {
  return (
    <Card className={styles.placeholder} title={title}>
      <p>{description}</p>
      <p>{detail}</p>
      {children}
    </Card>
  );
}
