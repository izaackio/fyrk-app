import { BalanceSheetExperience } from "../../../components/balance-sheet/BalanceSheetExperience";
import styles from "../../../components/theme/theme.module.css";

export default function BalanceSheetPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Balance Sheet</h2>
        <p className={styles.sectionDescription}>
          Unified net worth, allocation views, and data quality across the household.
        </p>
      </header>
      <BalanceSheetExperience />
    </section>
  );
}
