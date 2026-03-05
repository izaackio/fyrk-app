import { Suspense } from "react";

import { ProposalExperience } from "../../../components/proposals/ProposalExperience";
import styles from "../../../components/theme/theme.module.css";

export default function ProposalsPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Proposals</h2>
        <p className={styles.sectionDescription}>
          Create household proposals, manage discussion, and resolve each decision with clear
          approval or rejection transitions.
        </p>
      </header>
      <Suspense fallback={<p className={styles.sectionDescription}>Loading proposal workspace...</p>}>
        <ProposalExperience />
      </Suspense>
    </section>
  );
}
