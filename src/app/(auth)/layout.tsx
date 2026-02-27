import type { ReactNode } from "react";

import styles from "../../components/theme/theme.module.css";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.themeRoot} data-density="narrative" data-theme="light">
      <main className={styles.authShell}>
        <div className={styles.authGrid}>
          <section className={styles.authBrandPane}>
            <h1>Build your household financial operating system.</h1>
            <p>
              Fyrk combines institutional-quality clarity with calm, human guidance
              for modern households.
            </p>
            <ul className={styles.authPanelList}>
              <li>
                <span aria-hidden>•</span>
                <span>Magic-link authentication</span>
              </li>
              <li>
                <span aria-hidden>•</span>
                <span>Household-first onboarding</span>
              </li>
              <li>
                <span aria-hidden>•</span>
                <span>Warm Authority design language</span>
              </li>
            </ul>
          </section>

          <section className={styles.authFormPane}>{children}</section>
        </div>
      </main>
    </div>
  );
}
