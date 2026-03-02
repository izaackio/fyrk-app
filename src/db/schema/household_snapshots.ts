import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { households } from "./households";

export const householdSnapshots = pgTable(
  "household_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    totalNetWorth: integer("total_net_worth").notNull(),
    totalAssets: integer("total_assets").notNull(),
    totalLiabilities: integer("total_liabilities").notNull().default(0),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("household_snapshots_household_date_uniq").on(table.householdId, table.snapshotDate),
    index("idx_household_snapshots_household_date").on(table.householdId, table.snapshotDate),
    index("idx_household_snapshots_snapshot_date").on(table.snapshotDate),
    check("household_snapshots_currency_iso3_check", sql`char_length(${table.currency}) = 3`),
    check("household_snapshots_assets_non_negative_check", sql`${table.totalAssets} >= 0`),
    check("household_snapshots_liabilities_non_negative_check", sql`${table.totalLiabilities} >= 0`),
    check(
      "household_snapshots_net_worth_consistency_check",
      sql`${table.totalNetWorth} = ${table.totalAssets} - ${table.totalLiabilities}`,
    ),
  ],
);

export type HouseholdSnapshot = typeof householdSnapshots.$inferSelect;
export type NewHouseholdSnapshot = typeof householdSnapshots.$inferInsert;
