"use client";

import styles from "../../components/theme/theme.module.css";
import { Button } from "../../components/ui/Button";
import { RouteState } from "../../components/ui/RouteState";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <section className={styles.pageSection}>
      <RouteState
        description="The current route failed before it could render. Retry the route or return to onboarding if your household setup is still in progress."
        title="App route unavailable"
        tone="warning"
        actions={
          <>
            <Button onClick={reset} variant="primary">
              Retry route
            </Button>
            <Button onClick={() => window.location.assign("/onboarding")} variant="ghost">
              Open onboarding
            </Button>
          </>
        }
      >
        <p className={styles.noticeBody}>
          {error.message || "An unexpected route error occurred."}
        </p>
      </RouteState>
    </section>
  );
}
