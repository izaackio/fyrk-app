import styles from "../../../components/theme/theme.module.css";
import { TimelineExperience } from "../../../components/timeline/TimelineExperience";

export default function TimelinePage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Financial Timeline</h2>
        <p className={styles.sectionDescription}>
          Track household decisions, milestones, and life-event outcomes with filters and
          manual entries.
        </p>
      </header>
      <TimelineExperience />
    </section>
  );
}
