import { WaitlistForm } from "@/components/marketing/WaitlistForm";

import styles from "./landing.module.css";

const trustBandItems = [
  {
    title: "Built for households",
    description: "Joint and individual finances belong in one shared picture, not four disconnected tools.",
  },
  {
    title: "Private by design",
    description: "No ad model, no noisy social layer, and no incentive to turn household data into lead generation.",
  },
  {
    title: "Human onboarding",
    description: "Private demos and early access happen in small cohorts so the product and the relationship can stay thoughtful.",
  },
  {
    title: "Transparent stage",
    description: "Fyrk explains what exists today, what is still taking shape, and why that distinction matters.",
  },
] as const;

const problemCards = [
  {
    title: "Personal finance apps miss shared reality",
    description:
      "They are optimized for one person tracking spending, not for two adults or a family coordinating ownership, responsibility, and long-term goals.",
  },
  {
    title: "Budgets flatten the full picture",
    description:
      "Monthly categories rarely explain liquidity, debt, investing, home equity, or whether the household is actually getting stronger over time.",
  },
  {
    title: "Spreadsheets become invisible operating systems",
    description:
      "Important planning ends up in fragile custom sheets that only one person fully understands and almost no one wants to revisit every week.",
  },
  {
    title: "Big decisions arrive without a workspace",
    description:
      "Home moves, parental leave, uneven income, or retirement planning all require context and tradeoffs that normal tools are not built to hold.",
  },
] as const;

const howFyrkWorksSteps = [
  {
    number: "01",
    title: "Map the whole household",
    description:
      "Bring together the moving pieces that actually matter: cash, debt, investing, ownership, recurring obligations, and the people connected to them.",
  },
  {
    number: "02",
    title: "Translate movement into understanding",
    description:
      "Fyrk turns raw financial change into a readable household narrative so both partners can see what changed, what stayed stable, and what deserves attention.",
  },
  {
    number: "03",
    title: "Prepare decisions before life gets expensive",
    description:
      "Major events become structured conversations with context, tradeoffs, and a clear view of what each choice means for the household over time.",
  },
] as const;

const walkthroughCards = [
  {
    eyebrow: "Start here",
    title: "Household home",
    description:
      "A single operating view for members, responsibilities, account coverage, near-term priorities, and the overall shape of household money.",
    points: [
      "Who belongs to the household and how money is shared",
      "Which accounts and obligations are in the picture",
      "What deserves attention this week",
    ],
  },
  {
    eyebrow: "Core picture",
    title: "Balance sheet",
    description:
      "Net worth with structure, not just a headline number. Assets, liabilities, allocation, and movement sit in the same frame.",
    points: [
      "Cash, debt, and long-term assets together",
      "Ownership clarity across shared and personal holdings",
      "A truer picture than budget totals alone",
    ],
  },
  {
    eyebrow: "Ongoing rhythm",
    title: "Timeline",
    description:
      "The household story over time: changes, milestones, contributions, drawdowns, and the moments that should trigger a conversation.",
    points: [
      "Weekly narrative instead of account noise",
      "Life events in context, not as side notes",
      "A record of what changed and why",
    ],
  },
  {
    eyebrow: "Decision layer",
    title: "Reviews and proposals",
    description:
      "Structured planning for quarterly reviews and major household choices so insight can become an actual decision path.",
    points: [
      "Scenario framing for important tradeoffs",
      "Shared discussion instead of scattered notes",
      "An honest path from analysis to action",
    ],
  },
] as const;

const lifeEventCards = [
  {
    title: "Buying or moving home",
    description: "Understand affordability, liquidity, debt impact, and what the move changes for the rest of household life.",
  },
  {
    title: "Parental leave and childcare",
    description: "Plan around temporary income shifts, new recurring costs, and a different definition of financial slack.",
  },
  {
    title: "Combining finances",
    description: "Move from separate systems and assumptions into one shared operating picture without losing individual context.",
  },
  {
    title: "Uneven or variable income",
    description: "Handle freelancing, bonus cycles, commissions, or one partner carrying more of the financial volatility.",
  },
  {
    title: "Building a resilient buffer",
    description: "Protect short-term stability without breaking long-term investing habits or household confidence.",
  },
  {
    title: "Long-horizon family planning",
    description: "Think clearly about retirement, family support, education, and other decisions that span years rather than months.",
  },
] as const;

const privacyPillars = [
  {
    title: "Privacy by default",
    description:
      "Fyrk should ask for the minimum needed to create a useful household picture and treat that information like infrastructure, not inventory.",
  },
  {
    title: "Readable logic",
    description:
      "Important outputs should be understandable in plain language. A household should never need to trust a score it cannot interpret.",
  },
  {
    title: "Stage honesty",
    description:
      "The site, the demo, and the product must stay aligned. If something is early, limited, or still being built, Fyrk should say so directly.",
  },
] as const;

const conversionPaths = [
  {
    title: "Private demo",
    description: "For households with an active planning moment and the appetite to shape the product with real feedback.",
  },
  {
    title: "Early access",
    description: "For households who want updates now and a place in the next onboarding wave as access expands.",
  },
] as const;

export function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ambientBackdrop} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <p className={styles.wordmark}>FYRK</p>
            <p className={styles.headerTagline}>Household finance operating system</p>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            <a href="#how-fyrk-works" className={styles.navLink}>
              How it works
            </a>
            <a href="#privacy" className={styles.navLink}>
              Trust
            </a>
            <a href="#conversion" className={styles.headerCta}>
              Request demo
            </a>
          </nav>
        </header>

        <section className={`${styles.section} ${styles.heroSection}`} aria-labelledby="landing-title">
          <div className={styles.heroContent}>
            <p className={styles.eyebrowBadge}>Private demo + early access</p>
            <h1 id="landing-title" className={styles.heroTitle}>
              Your household&apos;s financial home.
            </h1>
            <p className={styles.heroLead}>
              Fyrk is a premium operating system for shared money. One calm place to understand what your household
              owns, what is changing, and what decisions come next.
            </p>
            <p className={styles.heroSublead}>
              Not another budget app. Not advisor software. A shared operating picture built for real households.
            </p>

            <div className={styles.ctaRow}>
              <a href="#conversion" className={styles.primaryCta}>
                Request private demo
              </a>
              <a href="#how-fyrk-works" className={styles.secondaryCta}>
                See how Fyrk works
              </a>
            </div>

            <p className={styles.disclaimer}>
              Fyrk is in active build. Private demos show the product direction today, and early access opens in
              deliberate waves.
            </p>
          </div>

          <div className={styles.heroCanvas} aria-label="Illustration of the Fyrk product model">
            <div className={styles.canvasFrame}>
              <div className={styles.canvasHeader}>
                <div>
                  <p className={styles.canvasEyebrow}>Inside Fyrk</p>
                  <h2 className={styles.canvasTitle}>
                    One operating picture for cash, investing, debt, and life decisions.
                  </h2>
                </div>
                <p className={styles.canvasMeta}>Designed for couples and families.</p>
              </div>

              <div className={styles.canvasGrid}>
                <article className={`${styles.canvasCard} ${styles.canvasCardLarge}`}>
                  <p className={styles.cardKicker}>Household picture</p>
                  <ul className={styles.canvasList}>
                    <li>Joint and personal finances in the same frame</li>
                    <li>Shared responsibilities without spreadsheet choreography</li>
                    <li>Current reality connected to the next important decision</li>
                  </ul>
                </article>

                <article className={styles.canvasCard}>
                  <p className={styles.cardKicker}>This week</p>
                  <ul className={styles.canvasList}>
                    <li>Review meaningful movement, not account noise</li>
                    <li>See which changes deserve a conversation</li>
                  </ul>
                </article>

                <article className={styles.canvasCard}>
                  <p className={styles.cardKicker}>Life events</p>
                  <div className={styles.chipRow}>
                    <span className={styles.canvasChip}>Move home</span>
                    <span className={styles.canvasChip}>Parental leave</span>
                    <span className={styles.canvasChip}>Emergency buffer</span>
                    <span className={styles.canvasChip}>Retirement</span>
                  </div>
                </article>

                <article className={styles.canvasCard}>
                  <p className={styles.cardKicker}>Decision desk</p>
                  <ul className={styles.canvasList}>
                    <li>Compare tradeoffs with household context attached</li>
                    <li>Turn insight into a shared next step</li>
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.trustBand} aria-label="Trust principles">
          {trustBandItems.map((item) => {
            return (
              <article key={item.title} className={styles.trustBandItem}>
                <p className={styles.trustBandTitle}>{item.title}</p>
                <p className={styles.trustBandDescription}>{item.description}</p>
              </article>
            );
          })}
        </section>

        <section className={`${styles.section} ${styles.problemSection}`} aria-labelledby="problem-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Why current tools fail</p>
            <h2 id="problem-title" className={styles.sectionTitle}>
              Most money tools are built around fragments. Households live in the full picture.
            </h2>
            <p className={styles.sectionLead}>
              Banks, budget apps, broker dashboards, advisor reports, and spreadsheets each solve one slice well.
              None of them become a calm household operating system on their own.
            </p>
          </div>

          <div className={styles.problemGrid}>
            {problemCards.map((card) => {
              return (
                <article key={card.title} className={styles.problemCard}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardBody}>{card.description}</p>
                </article>
              );
            })}

            <aside className={styles.problemStatement}>
              <p className={styles.statementLabel}>What households actually need</p>
              <p className={styles.statementText}>
                A shared operating model that makes the financial picture legible, keeps the important context intact,
                and turns major life decisions into something the household can handle together.
              </p>
            </aside>
          </div>
        </section>

        <section
          id="how-fyrk-works"
          className={`${styles.section} ${styles.processSection}`}
          aria-labelledby="how-fyrk-works-title"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>How Fyrk works</p>
            <h2 id="how-fyrk-works-title" className={styles.sectionTitle}>
              Fyrk turns scattered money data into a shared household rhythm.
            </h2>
            <p className={styles.sectionLead}>
              The point is not to collect more dashboards. The point is to create a calmer operating cadence for the
              conversations households already need to have.
            </p>
          </div>

          <div className={styles.processGrid}>
            <div className={styles.processSteps}>
              {howFyrkWorksSteps.map((step) => {
                return (
                  <article key={step.number} className={styles.processCard}>
                    <p className={styles.processNumber}>{step.number}</p>
                    <div>
                      <h3 className={styles.cardTitle}>{step.title}</h3>
                      <p className={styles.cardBody}>{step.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className={styles.processNote}>
              <p className={styles.noteEyebrow}>Design principle</p>
              <h3 className={styles.noteTitle}>Built for recurring conversations, not one-time setup.</h3>
              <p className={styles.noteBody}>
                Household finance is not just reporting. It is an ongoing sequence of check-ins, priorities, and
                decisions. Fyrk is shaped around that cadence.
              </p>
            </aside>
          </div>
        </section>

        <section className={`${styles.section} ${styles.walkthroughSection}`} aria-labelledby="walkthrough-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Product walkthrough</p>
            <h2 id="walkthrough-title" className={styles.sectionTitle}>
              Private demos move through four connected views.
            </h2>
            <p className={styles.sectionLead}>
              This is the product structure Fyrk is being built around. Early access opens in stages, but the model is
              already clear.
            </p>
          </div>

          <div className={styles.walkthroughGrid}>
            {walkthroughCards.map((card, index) => {
              return (
                <article
                  key={card.title}
                  className={`${styles.walkthroughCard} ${index === 0 ? styles.walkthroughFeatured : ""}`}
                >
                  <div className={styles.walkthroughHeader}>
                    <p className={styles.walkthroughEyebrow}>{card.eyebrow}</p>
                    <p className={styles.walkthroughIndex}>{String(index + 1).padStart(2, "0")}</p>
                  </div>
                  <h3 className={styles.walkthroughTitle}>{card.title}</h3>
                  <p className={styles.walkthroughDescription}>{card.description}</p>
                  <ul className={styles.walkthroughList}>
                    {card.points.map((point) => {
                      return <li key={point}>{point}</li>;
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className={`${styles.section} ${styles.eventsSection}`} aria-labelledby="life-events-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Life events</p>
            <h2 id="life-events-title" className={styles.sectionTitle}>
              Made for the moments that break ordinary money tools.
            </h2>
            <p className={styles.sectionLead}>
              Fyrk is for households who are making real decisions, not just monitoring a monthly budget in isolation.
            </p>
          </div>

          <div className={styles.eventGrid}>
            {lifeEventCards.map((card) => {
              return (
                <article key={card.title} className={styles.eventCard}>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                  <p className={styles.cardBody}>{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="privacy" className={`${styles.section} ${styles.privacySection}`} aria-labelledby="privacy-title">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Privacy, trust, and transparency</p>
            <h2 id="privacy-title" className={styles.sectionTitle}>
              Trust should come from restraint, clarity, and visible tradeoffs.
            </h2>
            <p className={styles.sectionLead}>
              Fyrk should earn trust by how it behaves, not by hiding behind vague promises or inflated social proof.
            </p>
          </div>

          <div className={styles.privacyGrid}>
            {privacyPillars.map((pillar) => {
              return (
                <article key={pillar.title} className={styles.privacyCard}>
                  <h3 className={styles.privacyTitle}>{pillar.title}</h3>
                  <p className={styles.privacyBody}>{pillar.description}</p>
                </article>
              );
            })}

            <aside className={styles.transparencyCard}>
              <p className={styles.noteEyebrow}>What that means on this page</p>
              <h3 className={styles.noteTitle}>No fake logos. No fake testimonials. No pretending the product is later-stage than it is.</h3>
              <p className={styles.noteBody}>
                The goal is a trustworthy introduction to a product in active build: clear enough to believe, calm
                enough to revisit, and honest enough to act on.
              </p>
            </aside>
          </div>
        </section>

        <section id="conversion" className={`${styles.section} ${styles.conversionSection}`} aria-labelledby="conversion-title">
          <div className={styles.conversionContent}>
            <div className={styles.conversionCopy}>
              <p className={styles.sectionKicker}>Next step</p>
              <h2 id="conversion-title" className={styles.sectionTitle}>
                See whether Fyrk fits your household.
              </h2>
              <p className={styles.sectionLead}>
                Request a private demo or join early access. Access opens carefully so the households coming in now
                match what Fyrk can support well.
              </p>

              <div className={styles.conversionPathGrid}>
                {conversionPaths.map((path) => {
                  return (
                    <article key={path.title} className={styles.conversionPathCard}>
                      <h3 className={styles.cardTitle}>{path.title}</h3>
                      <p className={styles.cardBody}>{path.description}</p>
                    </article>
                  );
                })}
              </div>

              <p className={styles.conversionNote}>
                Private demos are personal, not webinar-style. If the timing is not right for a demo, early access
                keeps you in the next wave.
              </p>
            </div>

            <div className={styles.formCard}>
              <div className={styles.formIntro}>
                <p className={styles.formEyebrow}>Private demo + early access</p>
                <h3 className={styles.formTitle}>Leave your email and we&apos;ll take it from there.</h3>
                <p className={styles.formText}>
                  We use email to coordinate private demos and early access invitations. No fake urgency, no spam.
                </p>
              </div>
              <WaitlistForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
