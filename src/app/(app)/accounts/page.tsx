import styles from "../../../components/theme/theme.module.css";
import { AccountsOverview } from "../../../components/accounts/AccountsOverview";

export default function AccountsPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Accounts</h2>
        <p className={styles.sectionDescription}>
          Add manual accounts, manage visibility, and review provider-reported values.
        </p>
      </header>
      <AccountsOverview />
    </section>
  );
}
