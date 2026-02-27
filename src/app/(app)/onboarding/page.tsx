import { HouseholdCreationWizard } from "../../../components/forms/HouseholdCreationWizard";
import styles from "../../../components/theme/theme.module.css";

export default function OnboardingPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Household onboarding</h2>
        <p className={styles.sectionDescription}>
          Step through household creation and optional partner invitation.
        </p>
      </header>
      <HouseholdCreationWizard />
    </section>
  );
}
