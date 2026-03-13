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
        This route stays available so navigation, household context, and page framing
        remain stable as the dedicated product surface fills in.
      </p>
      {children}
    </Card>
  );
}
