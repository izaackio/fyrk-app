import { DashboardInsights } from "../../../components/dashboard/DashboardInsights";
import styles from "../../../components/theme/theme.module.css";

export default function DashboardPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Good morning</h2>
        <p className={styles.sectionDescription}>
          Live household net worth and weekly insight narrative with graceful fallbacks.
        </p>
      </header>
      <DashboardInsights />
    </section>
  );
}
