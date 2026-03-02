import { AddAccountForm } from "../../../../components/forms/AddAccountForm";
import accountStyles from "../../../../components/accounts/accounts.module.css";
import styles from "../../../../components/theme/theme.module.css";
import { Card } from "../../../../components/ui/Card";

export default function AddAccountPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Add Account</h2>
        <p className={styles.sectionDescription}>
          Configure provider, account type, wrapper, currency, and visibility.
        </p>
      </header>

      <Card className={accountStyles.tableCard} title="Manual account setup">
        <AddAccountForm />
      </Card>
    </section>
  );
}
