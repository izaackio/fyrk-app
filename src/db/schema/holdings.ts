import { sql } from "drizzle-orm";
import { check, date, index, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { instruments } from "./instruments";

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    quantity: numeric("quantity", { precision: 18, scale: 8 }).notNull(),
    averageCost: integer("average_cost"),
    costCurrency: text("cost_currency"),
    marketValue: integer("market_value"),
    valueCurrency: text("value_currency"),
    asOfDate: date("as_of_date").notNull().default(sql`CURRENT_DATE`),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_holdings_account").on(table.accountId),
    index("idx_holdings_instrument").on(table.instrumentId),
    check("holdings_quantity_non_negative_check", sql`${table.quantity} >= 0`),
    check(
      "holdings_cost_currency_iso3_check",
      sql`${table.costCurrency} is null or char_length(${table.costCurrency}) = 3`,
    ),
    check(
      "holdings_value_currency_iso3_check",
      sql`${table.valueCurrency} is null or char_length(${table.valueCurrency}) = 3`,
    ),
    check("holdings_source_check", sql`${table.source} in ('manual', 'csv', 'api')`),
  ],
);

export type Holding = typeof holdings.$inferSelect;
export type NewHolding = typeof holdings.$inferInsert;
