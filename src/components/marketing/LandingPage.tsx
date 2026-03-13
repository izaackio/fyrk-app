"use client";

import Link from "next/link";

import { trackLandingEvent } from "@/components/marketing/analytics";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

import styles from "./landing.module.css";

const productPillars = [
  {
    title: "One household view",
    description:
      "Bring accounts, obligations, and long-term plans into one view that both partners can actually use.",
  },
  {
    title: "Weekly context, not just numbers",
    description:
      "Translate changes into plain language so the important movement is obvious before anyone opens a spreadsheet.",
  },
  {
    title: "Decision support for real life",
    description:
      "Plan for moves, children, career changes, or big purchases with clearer tradeoffs and next steps.",
  },
] as const;

const partnerProfiles = [
  {
    title: "For the partner who likes precision",
    description:
      "Scan balances, proposals, and review material quickly without losing the details that matter.",
  },
  {
    title: "For the partner who wants reassurance",
    description:
      "Understand whether the household is on track without turning every check-in into a technical exercise.",
  },
] as const;

const earlyAccessNotes = [
  {
    title: "Tell us your situation",
    description:
      "Share what kind of planning help your household is looking for so we can prioritize relevant onboarding.",
  },
  {
    title: "We match invites deliberately",
    description:
      "Early access is rolling out in small groups so the product and onboarding stay high-touch.",
  },
  {
    title: "Start with your own rhythm",
    description:
      "Once invited, you can begin with a real household setup or a guided demo before connecting anything.",
  },
] as const;

export function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ambientBackdrop} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.wordmark}>FYRK</p>
          <div className={styles.headerActions}>
            <Link className={styles.headerLink} href="/login">
              Sign in
            </Link>
            <a
              className={styles.headerCta}
              href="#waitlist"
              onClick={() => {
                trackLandingEvent("cta_waitlist_click", { placement: "header" });
              }}
            >
              Join early access
            </a>
          </div>
        </header>

        <section className={`${styles.panel} ${styles.hero}`} aria-labelledby="landing-title">
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <p className={styles.eyebrow}>Private early access for Swedish households</p>
              <h1 id="landing-title" className={styles.heroTitle}>
                Shared financial planning for couples who want more clarity and less spreadsheet stress.
              </h1>
              <p className={styles.heroLead}>
                Fyrk brings the full household picture, weekly context, and decision support into one calm place so both partners can understand what matters and decide faster together.
              </p>

              <div className={styles.ctaRow}>
                <a
                  href="#waitlist"
                  className={styles.primaryCta}
                  onClick={() => {
                    trackLandingEvent("cta_waitlist_click", { placement: "hero" });
                  }}
                >
                  Join early access
                </a>
                <Link
                  href="/signup"
                  className={styles.secondaryCta}
                  onClick={() => {
                    trackLandingEvent("cta_signup_click", { placement: "hero" });
                  }}
                >
                  Create an account
                </Link>
              </div>

              <ul className={styles.heroPoints}>
                <li className={styles.heroPoint}>Whole-household balance sheet and weekly summaries</li>
                <li className={styles.heroPoint}>Shared decision tracking for proposals and reviews</li>
                <li className={styles.heroPoint}>Guided planning for major life events</li>
              </ul>
            </div>

            <aside className={styles.heroAside}>
              <div className={styles.editorialCard}>
                <p className={styles.editorialEyebrow}>Built for two different comfort levels</p>
                <h2 className={styles.editorialTitle}>
                  One product for the person who wants the details and the person who mostly wants to know if everything is okay.
                </h2>
                <p className={styles.editorialText}>
                  Fyrk is designed to keep shared planning legible, calm, and useful for both people in the household.
                </p>

                <div className={styles.partnerGrid}>
                  {partnerProfiles.map((profile) => (
                    <article className={styles.partnerCard} key={profile.title}>
                      <h3 className={styles.partnerTitle}>{profile.title}</h3>
                      <p className={styles.partnerText}>{profile.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="what-changes-title">
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>What changes</p>
            <h2 id="what-changes-title" className={styles.sectionTitle}>
              A calmer way to handle the conversations that usually get postponed.
            </h2>
            <p className={styles.sectionLead}>
              The goal is not more finance theater. It is fewer blind spots, clearer weekly context, and a shared understanding of what to do next.
            </p>
          </div>
          <ul className={styles.pillarGrid}>
            {productPillars.map((pillar) => {
              return (
                <li key={pillar.title} className={styles.pillarCard}>
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarDescription}>{pillar.description}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="waitlist" className={`${styles.panel} ${styles.waitlistPanel}`} aria-labelledby="waitlist-title">
          <div className={styles.waitlistGrid}>
            <div className={styles.waitlistIntro}>
              <div className={styles.sectionHeader}>
                <p className={styles.sectionEyebrow}>Early access</p>
                <h2 id="waitlist-title" className={styles.sectionTitle}>
                  Join the waitlist
                </h2>
                <p className={styles.sectionLead}>
                  Tell us a little about your household so we can prioritize the right onboarding and private demo invites as capacity opens.
                </p>
              </div>

              <div className={styles.processGrid}>
                {earlyAccessNotes.map((step) => {
                  return (
                    <article key={step.title} className={styles.stepItem}>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepDescription}>{step.description}</p>
                    </article>
                  );
                })}
              </div>

              <ul className={styles.waitlistPoints}>
                <li className={styles.waitlistPoint}>Name and email for early-access updates</li>
                <li className={styles.waitlistPoint}>Optional context to shape onboarding priority</li>
                <li className={styles.waitlistPoint}>Straightforward feedback for submitted, duplicate, and error states</li>
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
