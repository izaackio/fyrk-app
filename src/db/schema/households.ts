import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profiles";

export const households = pgTable(
  "households",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull().default("household"),
    baseCurrency: text("base_currency").notNull().default("SEK"),
    isDemo: boolean("is_demo").notNull().default(false),
    demoVariant: text("demo_variant"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "households_type_check",
      sql`${table.type} in ('household', 'extended_family', 'circle')`,
    ),
    check("households_base_currency_iso3_check", sql`char_length(${table.baseCurrency}) = 3`),
    check(
      "households_demo_variant_check",
      sql`${table.demoVariant} is null or ${table.demoVariant} in ('standard', 'fire', 'fam_family', 'friendly_family')`,
    ),
  ],
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
