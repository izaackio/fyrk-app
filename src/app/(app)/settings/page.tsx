import { SettingsExperience } from "../../../components/settings/SettingsExperience";
import styles from "../../../components/theme/theme.module.css";

export default function SettingsPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Settings</h2>
        <p className={styles.sectionDescription}>
          Control shell preferences, session context, and privacy actions from one branded workspace.
        </p>
      </header>
      <SettingsExperience />
    </section>
  );
}
