import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { households } from "./households";
import { profiles } from "./profiles";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => profiles.id),
    providerId: text("provider_id").notNull(),
    providerName: text("provider_name").notNull(),
    name: text("name").notNull(),
    accountType: text("account_type").notNull(),
    wrapperType: text("wrapper_type"),
    currency: text("currency").notNull().default("SEK"),
    visibility: text("visibility").notNull().default("full"),
    externalId: text("external_id"),
    lastSynced: timestamp("last_synced", { withTimezone: true }),
    syncSource: text("sync_source").notNull().default("manual"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_accounts_household").on(table.householdId),
    index("idx_accounts_owner").on(table.ownerUserId),
    check(
      "accounts_account_type_check",
      sql`${table.accountType} in ('investment', 'savings', 'pension', 'loan', 'mortgage', 'insurance')`,
    ),
    check(
      "accounts_wrapper_type_check",
      sql`${table.wrapperType} is null or ${table.wrapperType} in ('ISK', 'KF', 'depa', 'PPM', 'tjanstepension', 'private_pension')`,
    ),
    check("accounts_currency_iso3_check", sql`char_length(${table.currency}) = 3`),
    check(
      "accounts_visibility_check",
      sql`${table.visibility} in ('full', 'amount_hidden', 'private')`,
    ),
    check(
      "accounts_sync_source_check",
      sql`${table.syncSource} in ('manual', 'csv', 'psd2', 'fida')`,
    ),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
