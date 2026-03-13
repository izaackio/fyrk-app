import styles from "../../../components/theme/theme.module.css";
import { TimelineExperience } from "../../../components/timeline/TimelineExperience";

export default function TimelinePage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Financial Timeline</h2>
        <p className={styles.sectionDescription}>
          Track important decisions, milestones, and future events in one record.
        </p>
      </header>
      <TimelineExperience />
    </section>
  );
}
