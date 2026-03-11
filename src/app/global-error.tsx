"use client";

import Link from "next/link";

import styles from "../components/theme/theme.module.css";
import { Button } from "../components/ui/Button";
import { RouteState } from "../components/ui/RouteState";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className={styles.themeRoot}>
        <main
          style={{
            margin: "0 auto",
            maxWidth: "880px",
            minHeight: "100vh",
            padding: "48px 16px",
          }}
        >
          <RouteState
            description="The application hit a boundary-level error before the normal shell could recover. Retry first, then return to the public entry if needed."
            title="Fyrk is temporarily unavailable"
            tone="warning"
            actions={
              <>
                <Button onClick={reset}>Retry</Button>
                <Link className={[styles.button, styles.buttonGhost].join(" ")} href="/">
                  Return home
                </Link>
              </>
            }
          >
            <p className={styles.noticeBody}>
              {error.message || "An unexpected error interrupted the application."}
            </p>
          </RouteState>
        </main>
      </body>
    </html>
  );
}
