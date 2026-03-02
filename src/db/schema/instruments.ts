import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const instruments = pgTable(
  "instruments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    isin: text("isin"),
    ticker: text("ticker"),
    name: text("name").notNull(),
    assetClass: text("asset_class").notNull(),
    currency: text("currency").notNull(),
    exchange: text("exchange"),
    country: text("country"),
    sector: text("sector"),
    lastPrice: integer("last_price"),
    lastPriceAt: timestamp("last_price_at", { withTimezone: true }),
    priceSource: text("price_source"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_instruments_isin").on(table.isin),
    index("idx_instruments_ticker").on(table.ticker),
    check("instruments_currency_iso3_check", sql`char_length(${table.currency}) = 3`),
    check(
      "instruments_country_iso2_check",
      sql`${table.country} is null or char_length(${table.country}) = 2`,
    ),
    check(
      "instruments_asset_class_check",
      sql`${table.assetClass} in ('equity', 'fixed_income', 'fund', 'etf', 'cash', 'real_estate', 'crypto', 'other')`,
    ),
    check(
      "instruments_price_source_check",
      sql`${table.priceSource} is null or ${table.priceSource} in ('yahoo', 'manual', 'imported')`,
    ),
  ],
);

export type Instrument = typeof instruments.$inferSelect;
export type NewInstrument = typeof instruments.$inferInsert;
