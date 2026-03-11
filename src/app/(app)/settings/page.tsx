import { FeaturePlaceholder } from "../../../components/dashboard/FeaturePlaceholder";
import styles from "../../../components/theme/theme.module.css";
import { Card } from "../../../components/ui/Card";
import { RouteState } from "../../../components/ui/RouteState";

export default function SettingsPage() {
  return (
    <section className={styles.pageSection}>
      <RouteState
        description="Shell preferences already apply instantly from the top bar. This route keeps broader profile and privacy controls discoverable."
        title="Settings workspace"
      />
      <FeaturePlaceholder
        description="Theme and density controls already work in the top bar; this page now acts as the hand-off point for profile, privacy, and export controls."
        title="Settings"
      />
      <Card className={styles.placeholder} title="Current controls">
        <ul className={styles.list}>
          <li className={styles.listItem}>Warm light and warm dark mode toggle.</li>
          <li className={styles.listItem}>Narrative and terminal density toggle.</li>
          <li className={styles.listItem}>Responsive shell preferences saved locally between visits.</li>
        </ul>
      </Card>
    </section>
  );
}
