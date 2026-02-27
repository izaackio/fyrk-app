import type { ReactNode } from "react";

import styles from "../theme/theme.module.css";
import { Card } from "../ui/Card";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function FeaturePlaceholder({
  title,
  description,
  children,
}: FeaturePlaceholderProps) {
  return (
    <Card className={styles.placeholder} title={title}>
      <p>{description}</p>
      <p>
        This section is intentionally scoped as Sprint 1 placeholder content while
        preserving final information architecture and navigation behavior.
      </p>
      {children}
    </Card>
  );
}
