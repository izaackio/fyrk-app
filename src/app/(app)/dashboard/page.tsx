import { DashboardPlaceholder } from "../../../components/dashboard/DashboardPlaceholder";
import styles from "../../../components/theme/theme.module.css";

export default function DashboardPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Good morning</h2>
        <p className={styles.sectionDescription}>
          Household overview with Sprint 1 placeholders for balances, fitness, and
          narrative context.
        </p>
      </header>
      <DashboardPlaceholder />
    </section>
  );
}
