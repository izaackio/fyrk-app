import { EventsExperience } from "../../../components/events/EventsExperience";
import styles from "../../../components/theme/theme.module.css";

export default function EventsPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Life Events</h2>
        <p className={styles.sectionDescription}>
          Launch event playbooks, assign checklist actions, and track completion progress.
        </p>
      </header>
      <EventsExperience />
    </section>
  );
}
