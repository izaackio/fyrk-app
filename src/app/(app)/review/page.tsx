import { ReviewExperience } from "../../../components/review/ReviewExperience";
import styles from "../../../components/theme/theme.module.css";

export default function ReviewPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Quarterly Review</h2>
        <p className={styles.sectionDescription}>
          Generate deterministic quarterly reviews, inspect detailed recommendations, and
          track readiness for publication and export.
        </p>
      </header>
      <ReviewExperience />
    </section>
  );
}
