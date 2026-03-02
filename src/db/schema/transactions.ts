import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { instruments } from "./instruments";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    instrumentId: uuid("instrument_id").references(() => instruments.id),
    type: text("type").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 8 }),
    price: integer("price"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull(),
    feeAmount: integer("fee_amount").notNull().default(0),
    feeCurrency: text("fee_currency"),
    fxRate: numeric("fx_rate", { precision: 12, scale: 6 }),
    fxAmount: integer("fx_amount"),
    fxCurrency: text("fx_currency"),
    transactionDate: date("transaction_date").notNull(),
    settlementDate: date("settlement_date"),
    description: text("description"),
    externalRef: text("external_ref"),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_txn_account").on(table.accountId),
    index("idx_txn_date").on(table.transactionDate),
    index("idx_txn_instrument").on(table.instrumentId),
    check(
      "transactions_type_check",
      sql`${table.type} in ('buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee', 'interest', 'transfer', 'tax')`,
    ),
    check("transactions_currency_iso3_check", sql`char_length(${table.currency}) = 3`),
    check(
      "transactions_fee_currency_iso3_check",
      sql`${table.feeCurrency} is null or char_length(${table.feeCurrency}) = 3`,
    ),
    check(
      "transactions_fx_currency_iso3_check",
      sql`${table.fxCurrency} is null or char_length(${table.fxCurrency}) = 3`,
    ),
    check("transactions_source_check", sql`${table.source} in ('manual', 'csv', 'api')`),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
