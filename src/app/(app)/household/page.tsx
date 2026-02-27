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
      <Card className={styles.placeholder} title="Sprint 1 scope">
        <ul className={styles.list}>
          <li className={styles.listItem}>Create household in onboarding</li>
          <li className={styles.listItem}>Invite partner by email (optional)</li>
          <li className={styles.listItem}>Member roles and edits in next sprint</li>
        </ul>
      </Card>
    </section>
  );
}
