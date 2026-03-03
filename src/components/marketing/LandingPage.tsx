"use client";

import Link from "next/link";

import { trackLandingEvent } from "@/components/marketing/analytics";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

import styles from "./landing.module.css";

const pillars = [
  {
    title: "One shared financial picture",
    description:
      "Bring household accounts and long-term plans into one calm overview built for conversations, not spreadsheets.",
  },
  {
    title: "Clear weekly progress",
    description:
      "Translate account movement into plain-language updates so both partners can understand what changed and why.",
  },
  {
    title: "Decision-ready guidance",
    description:
      "Prepare for major life events with practical next steps, aligned priorities, and less financial guesswork.",
  },
  {
    title: "Built for trust",
    description:
      "Privacy-first architecture and household permissions keep sensitive data safe while collaboration stays simple.",
  },
] as const;

const launchSignals = [
  {
    label: "Pilot cohort",
    value: "Q2 2026",
    note: "Small-group onboarding",
  },
  {
    label: "Launch market",
    value: "Sweden",
    note: "Households first",
  },
  {
    label: "Experience",
    value: "Narrative",
    note: "Calm by default",
  },
] as const;

const onboardingSteps = [
  "Join the waitlist with your context and priorities.",
  "Receive staged onboarding updates during the pre-launch window.",
  "Get invited to early access or private demo rounds as capacity opens.",
] as const;

export function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ambientBackdrop} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.wordmark}>FYRK</p>
          <p className={styles.headerMeta}>Warm Authority | Pre-launch</p>
        </header>

        <section className={`${styles.panel} ${styles.hero}`} aria-labelledby="landing-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.prelaunchBadge}>Pre-launch</span>
              <h1 id="landing-title" className={styles.heroTitle}>
                Household money planning that feels calm, clear, and shared.
              </h1>
              <p className={styles.heroLead}>
                Fyrk helps couples track what matters, understand progress, and make financial decisions together.
                The product is in active build, and this page is the early-access gateway.
              </p>

              <div className={styles.ctaRow}>
                <Link
                  href="/signup"
                  className={styles.primaryCta}
                  onClick={() => {
                    trackLandingEvent("cta_signup_click", { placement: "hero" });
                  }}
                >
                  Continue to signup
                </Link>
                <a
                  href="#waitlist"
                  className={styles.secondaryCta}
                  onClick={() => {
                    trackLandingEvent("cta_demo_interest_click", { placement: "hero" });
                  }}
                >
                  Request private demo access
                </a>
              </div>

              <p className={styles.disclaimer}>
                Early-access communication only. No live banking or portfolio automation is available yet.
              </p>
            </div>

            <aside className={styles.heroAside} aria-label="Launch signals">
              <p className={styles.asideEyebrow}>Launch signals</p>
              <dl className={styles.signalGrid}>
                {launchSignals.map((signal) => {
                  return (
                    <div key={signal.label} className={styles.signalCard}>
                      <dt className={styles.signalLabel}>{signal.label}</dt>
                      <dd className={styles.signalValue}>{signal.value}</dd>
                      <p className={styles.signalNote}>{signal.note}</p>
                    </div>
                  );
                })}
              </dl>
            </aside>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="what-is-fyrk-title">
          <h2 id="what-is-fyrk-title" className={styles.sectionTitle}>
            What is Fyrk?
          </h2>
          <p className={styles.sectionLead}>
            A household-first planning experience that combines narrative clarity with financial precision.
          </p>
          <ul className={styles.pillarGrid}>
            {pillars.map((pillar) => {
              return (
                <li key={pillar.title} className={styles.pillarCard}>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarDescription}>{pillar.description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="onboarding-title">
          <h2 id="onboarding-title" className={styles.sectionTitle}>
            How pre-launch onboarding works
          </h2>
          <ol className={styles.stepList}>
            {onboardingSteps.map((step) => {
              return (
                <li key={step} className={styles.stepItem}>
                  {step}
                </li>
              );
            })}
          </ol>
        </section>

        <section id="waitlist" className={`${styles.panel} ${styles.waitlistPanel}`} aria-labelledby="waitlist-title">
          <div className={styles.waitlistGrid}>
            <div>
              <h2 id="waitlist-title" className={styles.sectionTitle}>
                Join the waitlist
              </h2>
              <p className={styles.sectionLead}>
                Share your household context so we can prioritize relevant onboarding and demo invites.
              </p>
              <ul className={styles.waitlistPoints}>
                <li className={styles.waitlistPoint}>Name and email for launch communication</li>
                <li className={styles.waitlistPoint}>Optional context to shape cohort prioritization</li>
                <li className={styles.waitlistPoint}>Clear feedback for submitted, duplicate, and error states</li>
              </ul>
            </div>

            <div className={styles.waitlistCard}>
              <WaitlistForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
