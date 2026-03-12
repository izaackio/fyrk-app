import type { Metadata } from "next";
import type { ReactNode } from "react";

import styles from "../../components/theme/theme.module.css";

interface AuthLayoutProps {
  children: ReactNode;
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.themeRoot} data-density="narrative" data-theme="light">
      <main className={styles.authShell}>
        <div className={styles.authGrid}>
          <section className={styles.authBrandPane}>
            <p className={styles.authEyebrow}>Private early access for Swedish households</p>
            <h1>Shared money planning that both partners can actually use.</h1>
            <p>
              Bring balances, weekly context, and upcoming decisions into one calm
              workspace so no one has to translate the full household picture alone.
            </p>
            <div className={styles.authFeatureGrid}>
              <article className={styles.authFeatureCard}>
                <h2>One shared view</h2>
                <p>See assets, liabilities, and responsibilities together instead of across separate notes and spreadsheets.</p>
              </article>
              <article className={styles.authFeatureCard}>
                <h2>Weekly context</h2>
                <p>Keep the important movement visible without turning every check-in into a technical review.</p>
              </article>
              <article className={styles.authFeatureCard}>
                <h2>Clear next steps</h2>
                <p>Move from “we should talk about this” to a practical decision, review, or plan.</p>
              </article>
            </div>
            <p className={styles.authBrandNote}>
              Start with a magic link, create your household, and switch to a denser
              review mode whenever you want more information on screen.
            </p>
          </section>

          <section className={styles.authFormPane}>
            <div className={styles.authFormPanel}>{children}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
