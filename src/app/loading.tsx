import styles from "../components/theme/theme.module.css";
import { RouteState } from "../components/ui/RouteState";

export default function RootLoading() {
  return (
    <main
      className={styles.themeRoot}
      style={{ margin: "0 auto", maxWidth: "880px", minHeight: "100vh", padding: "48px 16px" }}
    >
      <RouteState
        busy
        description="Preparing the Fyrk shell, metadata, and the first screen for this route."
        title="Loading Fyrk"
      />
    </main>
  );
}
