import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { profiles } from "./profiles";

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    status: text("status").notNull().default("preview"),
    rowsParsed: integer("rows_parsed").notNull().default(0),
    holdingsDetected: integer("holdings_detected").notNull().default(0),
    transactionsDetected: integer("transactions_detected").notNull().default(0),
    instrumentsResolved: integer("instruments_resolved").notNull().default(0),
    instrumentsUnresolved: integer("instruments_unresolved").notNull().default(0),
    fileName: text("file_name"),
    fileChecksum: text("file_checksum"),
    preview: jsonb("preview").notNull().default(sql`'{}'::jsonb`),
    errorMessage: text("error_message"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_import_jobs_account").on(table.accountId),
    index("idx_import_jobs_created_by").on(table.createdBy),
    index("idx_import_jobs_status").on(table.status),
    index("idx_import_jobs_created_at").on(table.createdAt),
    check("import_jobs_format_check", sql`${table.format} in ('avanza', 'nordnet', 'unknown')`),
    check(
      "import_jobs_status_check",
      sql`${table.status} in ('preview', 'confirmed', 'failed', 'cancelled', 'expired')`,
    ),
    check("import_jobs_rows_parsed_non_negative_check", sql`${table.rowsParsed} >= 0`),
    check("import_jobs_holdings_detected_non_negative_check", sql`${table.holdingsDetected} >= 0`),
    check(
      "import_jobs_transactions_detected_non_negative_check",
      sql`${table.transactionsDetected} >= 0`,
    ),
    check(
      "import_jobs_instruments_resolved_non_negative_check",
      sql`${table.instrumentsResolved} >= 0`,
    ),
    check(
      "import_jobs_instruments_unresolved_non_negative_check",
      sql`${table.instrumentsUnresolved} >= 0`,
    ),
  ],
);

export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;
