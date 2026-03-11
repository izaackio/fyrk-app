import { Suspense } from "react";

import { CsvImportFlow } from "../../../components/accounts/CsvImportFlow";
import styles from "../../../components/theme/theme.module.css";
import { RouteState } from "../../../components/ui/RouteState";

export default function ImportPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Import CSV</h2>
        <p className={styles.sectionDescription}>
          Upload, preview, and confirm transaction and holdings imports.
        </p>
      </header>
      <Suspense
        fallback={
          <RouteState
            busy
            description="Preparing the import workspace, account list, and CSV preview tools."
            title="Preparing import flow"
          />
        }
      >
        <CsvImportFlow />
      </Suspense>
    </section>
  );
}
