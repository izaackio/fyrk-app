import { DashboardInsights } from "../../../components/dashboard/DashboardInsights";
import { Sprint5SummaryCards } from "../../../components/dashboard/Sprint5SummaryCards";
import styles from "../../../components/theme/theme.module.css";

export default function DashboardPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Overview</h2>
        <p className={styles.sectionDescription}>
          A shared view of household progress, weekly context, and next actions.
        </p>
      </header>
      <DashboardInsights />
      <Sprint5SummaryCards />
    </section>
  );
}
