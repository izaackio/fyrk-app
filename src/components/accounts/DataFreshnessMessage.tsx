import styles from "./accounts.module.css";
import { getFreshnessSummary } from "./formatters";
import type { AccountSyncSource } from "./contracts";

interface DataFreshnessMessageProps {
  lastSynced: string | null | undefined;
  syncSource: AccountSyncSource;
}

const toneClassByLevel = {
  aged: styles.freshnessAged,
  fresh: styles.freshnessFresh,
  stale: styles.freshnessStale,
  unknown: styles.freshnessUnknown,
};

export function DataFreshnessMessage({
  lastSynced,
  syncSource,
}: DataFreshnessMessageProps) {
  const freshness = getFreshnessSummary(lastSynced, syncSource);

  return (
    <p
      className={[styles.freshnessMessage, toneClassByLevel[freshness.level]]
        .filter(Boolean)
        .join(" ")}
      role="status"
    >
      {freshness.details}
    </p>
  );
}
