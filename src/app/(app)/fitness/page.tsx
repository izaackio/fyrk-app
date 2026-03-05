import { FitnessExperience } from "../../../components/fitness/FitnessExperience";
import styles from "../../../components/theme/theme.module.css";

export default function FitnessPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Financial Fitness</h2>
        <p className={styles.sectionDescription}>
          Review total score, component performance, trend history, and highest-impact next
          actions.
        </p>
      </header>
      <FitnessExperience />
    </section>
  );
}
