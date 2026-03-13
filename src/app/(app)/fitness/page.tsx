import { FitnessExperience } from "../../../components/fitness/FitnessExperience";
import styles from "../../../components/theme/theme.module.css";

export default function FitnessPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Financial Fitness</h2>
        <p className={styles.sectionDescription}>
          See the household score, what is helping, and what to improve next.
        </p>
      </header>
      <FitnessExperience />
    </section>
  );
}
