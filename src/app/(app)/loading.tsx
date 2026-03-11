import styles from "../../components/theme/theme.module.css";
import { RouteState } from "../../components/ui/RouteState";

export default function AppLoading() {
  return (
    <section className={styles.pageSection}>
      <RouteState
        busy
        description="We are preparing the selected household workspace, including route data and shell preferences."
        title="Loading workspace"
      />
    </section>
  );
}
