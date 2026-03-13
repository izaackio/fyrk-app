import { FeaturePlaceholder } from "../../../components/dashboard/FeaturePlaceholder";
import styles from "../../../components/theme/theme.module.css";
import { Card } from "../../../components/ui/Card";

export default function HouseholdPage() {
  return (
    <section className={styles.pageSection}>
      <FeaturePlaceholder
        description="Household member management and invitation history are anchored here and mapped to household API contracts."
        title="Household"
      />
      <Card className={styles.placeholder} title="Available now">
        <ul className={styles.list}>
          <li className={styles.listItem}>Create the household during setup</li>
          <li className={styles.listItem}>Invite a partner by email when needed</li>
          <li className={styles.listItem}>Role controls will expand here as member management deepens</li>
        </ul>
      </Card>
    </section>
  );
}
