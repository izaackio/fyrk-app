import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";

export const accountSnapshots = pgTable(
  "account_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    totalValue: integer("total_value").notNull(),
    cashBalance: integer("cash_balance").notNull().default(0),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("account_snapshots_account_date_uniq").on(table.accountId, table.snapshotDate),
    index("idx_snap_account_date").on(table.accountId, table.snapshotDate),
    check("account_snapshots_currency_iso3_check", sql`char_length(${table.currency}) = 3`),
  ],
);

export type AccountSnapshot = typeof accountSnapshots.$inferSelect;
export type NewAccountSnapshot = typeof accountSnapshots.$inferInsert;
