import styles from "../../../components/theme/theme.module.css";
import { CsvImportFlow } from "../../../components/accounts/CsvImportFlow";

export default function ImportPage() {
  return (
    <section className={styles.pageSection}>
      <header className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Import CSV</h2>
        <p className={styles.sectionDescription}>
          Upload, preview, and confirm transaction and holdings imports.
        </p>
      </header>
      <CsvImportFlow />
    </section>
  );
}
