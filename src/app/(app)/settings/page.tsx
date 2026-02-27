import { FeaturePlaceholder } from "../../../components/dashboard/FeaturePlaceholder";
import styles from "../../../components/theme/theme.module.css";
import { Card } from "../../../components/ui/Card";

export default function SettingsPage() {
  return (
    <section className={styles.pageSection}>
      <FeaturePlaceholder
        description="Theme and density controls already work in the top bar; this page anchors broader profile and privacy settings."
        title="Settings"
      />
      <Card className={styles.placeholder} title="Current controls">
        <ul className={styles.list}>
          <li className={styles.listItem}>Warm light and warm dark mode toggle</li>
          <li className={styles.listItem}>Narrative and terminal density toggle</li>
          <li className={styles.listItem}>Responsive shell preferences saved locally</li>
        </ul>
      </Card>
    </section>
  );
}
