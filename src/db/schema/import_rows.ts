import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { importJobs } from "./import_jobs";
import { instruments } from "./instruments";

export const importRows = pgTable(
  "import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    rowKind: text("row_kind").notNull(),
    rawData: jsonb("raw_data").notNull().default(sql`'{}'::jsonb`),
    normalizedData: jsonb("normalized_data"),
    validationErrors: jsonb("validation_errors").notNull().default(sql`'[]'::jsonb`),
    resolutionStatus: text("resolution_status").notNull().default("pending"),
    instrumentId: uuid("instrument_id").references(() => instruments.id),
    dedupeKey: text("dedupe_key"),
    applied: boolean("applied").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("import_rows_job_row_kind_uniq").on(table.importJobId, table.rowIndex, table.rowKind),
    index("idx_import_rows_job").on(table.importJobId),
    index("idx_import_rows_status").on(table.resolutionStatus),
    index("idx_import_rows_instrument").on(table.instrumentId),
    check("import_rows_row_index_non_negative_check", sql`${table.rowIndex} >= 0`),
    check(
      "import_rows_row_kind_check",
      sql`${table.rowKind} in ('transaction', 'holding', 'account', 'instrument', 'unknown')`,
    ),
    check(
      "import_rows_resolution_status_check",
      sql`${table.resolutionStatus} in ('pending', 'valid', 'invalid', 'ignored', 'resolved')`,
    ),
  ],
);

export type ImportRow = typeof importRows.$inferSelect;
export type NewImportRow = typeof importRows.$inferInsert;
