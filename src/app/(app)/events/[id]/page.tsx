import { EventDetailExperience } from "../../../../components/events/EventDetailExperience";
import styles from "../../../../components/theme/theme.module.css";

interface EventDetailPageProps {
  params: {
    id: string;
  };
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Playbook Detail</h2>
        <p className={styles.sectionDescription}>
          Work through checklist actions, assignments, and impact assumptions for this
          event.
        </p>
      </header>
      <EventDetailExperience eventId={params.id} />
    </section>
  );
}
