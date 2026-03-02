import Link from "next/link";

import themeStyles from "../theme/theme.module.css";
import type { AccountSummary } from "./contracts";
import { PROVIDER_ICON_BY_ID } from "./constants";
import { formatMoney } from "./formatters";
import { DataFreshnessMessage } from "./DataFreshnessMessage";
import styles from "./accounts.module.css";

interface AccountCardProps {
  account: AccountSummary;
}

export function AccountCard({ account }: AccountCardProps) {
  const providerGlyph = PROVIDER_ICON_BY_ID[account.providerId] ?? "•";

  return (
    <article className={styles.accountCard}>
      <header className={styles.accountHeader}>
        <div className={styles.providerBadge} aria-hidden>
          {providerGlyph}
        </div>
        <div className={styles.accountHeading}>
          <h3 className={styles.accountTitle}>{account.name}</h3>
          <p className={styles.accountMeta}>
            {account.providerName} · {account.accountType} · {account.wrapperType}
          </p>
        </div>
        <span className={styles.visibilityTag}>Visibility: {account.visibility}</span>
      </header>

      <div className={styles.accountValueBlock}>
        <p className={styles.accountValueLabel}>Provider-reported value</p>
        <p className={styles.accountValueNumber}>
          {formatMoney(account.totalValue, account.currency)}
        </p>
        <p className={styles.accountMeta}>
          {account.holdingsCount} holdings · {account.currency}
        </p>
      </div>

      <DataFreshnessMessage lastSynced={account.lastSynced} syncSource={account.syncSource} />

      <div className={styles.inlineActions}>
        <Link
          className={[themeStyles.button, themeStyles.buttonSecondary].join(" ")}
          href={`/accounts/${account.id}`}
        >
          Open account
        </Link>
        <Link
          className={[themeStyles.button, themeStyles.buttonGhost].join(" ")}
          href={`/import?accountId=${encodeURIComponent(account.id)}`}
        >
          Import CSV
        </Link>
      </div>
    </article>
  );
}
