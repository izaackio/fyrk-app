import { HouseholdWorkspace } from "../../../components/household/HouseholdWorkspace";
import styles from "../../../components/theme/theme.module.css";

export default function HouseholdPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Household</h2>
        <p className={styles.sectionDescription}>
          Manage partner access, roles, and invitations in one place.
        </p>
      </header>
      <HouseholdWorkspace />
    </section>
  );
}
