import { FeaturePlaceholder } from "../../../components/dashboard/FeaturePlaceholder";
import styles from "../../../components/theme/theme.module.css";
import { Card } from "../../../components/ui/Card";
import { RouteState } from "../../../components/ui/RouteState";

export default function HouseholdPage() {
  return (
    <section className={styles.pageSection}>
      <RouteState
        description="Member management is anchored here. Invites start during onboarding today, and this route now keeps the next expected actions visible."
        title="Household workspace"
      />
      <FeaturePlaceholder
        description="Use onboarding to create the household and send the first invite. This route is the hand-off point for edits, role changes, and invite history."
        title="Household"
      />
      <Card className={styles.placeholder} title="What you can do today">
        <ul className={styles.list}>
          <li className={styles.listItem}>Create the household in onboarding.</li>
          <li className={styles.listItem}>Send the first partner invite during setup.</li>
          <li className={styles.listItem}>Return here for member edits and invite history as those controls ship.</li>
        </ul>
      </Card>
    </section>
  );
}
