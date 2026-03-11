import { Suspense } from "react";

import { AccountDetailView } from "../../../../components/accounts/AccountDetailView";
import styles from "../../../../components/theme/theme.module.css";
import { RouteState } from "../../../../components/ui/RouteState";

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
      <Suspense
        fallback={
          <RouteState
            busy
            description="Loading account metadata, holdings, and transaction history."
            title="Loading account view"
          />
        }
      >
        <AccountDetailView accountId={params.id} />
      </Suspense>
    </section>
  );
}
