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

const socialProofItems = [
  {
    label: "Early access focus",
    value: "Swedish households",
  },
  {
    label: "Product stage",
    value: "Pre-launch",
  },
  {
    label: "Experience goal",
    value: "Calm + decision-ready",
  },
] as const;

export function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={`${styles.panel} ${styles.hero}`} aria-labelledby="landing-title">
          <span className={styles.prelaunchBadge}>Pre-launch</span>
          <h1 id="landing-title" className={styles.heroTitle}>
            Household money planning that feels calm, clear, and shared.
          </h1>
          <p className={styles.heroLead}>
            Fyrk helps couples track what matters, understand progress, and make financial decisions together.
            The full app is still in active build. Join the waitlist for launch updates and early onboarding.
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
            This page is for early access only. No live banking or portfolio automation is available yet.
          </p>
        </section>

        <section className={styles.panel} aria-labelledby="what-is-fyrk-title">
          <h2 id="what-is-fyrk-title" className={styles.sectionTitle}>
            What is Fyrk?
          </h2>
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

        <section className={`${styles.panel} ${styles.socialProof}`} aria-labelledby="social-proof-title">
          <h2 id="social-proof-title" className={styles.sectionTitle}>
            Built for Swedish couples preparing ahead
          </h2>
          <p className={styles.sectionLead}>
            We are onboarding small cohorts first to tune reliability, clarity, and household collaboration flows.
          </p>
          <dl className={styles.statsGrid}>
            {socialProofItems.map((item) => {
              return (
                <div key={item.label} className={styles.statCard}>
                  <dt className={styles.statLabel}>{item.label}</dt>
                  <dd className={styles.statValue}>{item.value}</dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section id="waitlist" className={`${styles.panel} ${styles.waitlistSection}`} aria-labelledby="waitlist-title">
          <h2 id="waitlist-title" className={styles.sectionTitle}>
            Join the waitlist
          </h2>
          <p className={styles.sectionLead}>
            Share a few details so we can prioritize onboarding and invite relevant early demo sessions.
          </p>
          <WaitlistForm />
        </section>
      </div>
    </main>
  );
}
