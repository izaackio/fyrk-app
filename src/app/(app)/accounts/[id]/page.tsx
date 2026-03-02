import { Suspense } from "react";

import { AccountDetailView } from "../../../../components/accounts/AccountDetailView";
import styles from "../../../../components/theme/theme.module.css";

interface AccountDetailPageProps {
  params: {
    id: string;
  };
}

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Account Detail</h2>
        <p className={styles.sectionDescription}>
          Holdings and transaction history from provider-reported account data.
        </p>
      </header>
      <Suspense fallback={<p className={styles.sectionDescription}>Loading account view…</p>}>
        <AccountDetailView accountId={params.id} />
      </Suspense>
    </section>
  );
}
