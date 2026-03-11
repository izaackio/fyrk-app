import Link from "next/link";

import styles from "../components/theme/theme.module.css";
import { RouteState } from "../components/ui/RouteState";

export default function NotFound() {
  return (
    <main
      className={styles.themeRoot}
      style={{ margin: "0 auto", maxWidth: "880px", minHeight: "100vh", padding: "48px 16px" }}
    >
      <RouteState
        description="The page you requested does not exist in this build. Use the public entry or go back to the app shell."
        title="Page not found"
        actions={
          <>
            <Link className={[styles.button, styles.buttonPrimary].join(" ")} href="/">
              Home
            </Link>
            <Link className={[styles.button, styles.buttonGhost].join(" ")} href="/dashboard">
              App shell
            </Link>
          </>
        }
      />
    </main>
  );
}
