import { sql } from "drizzle-orm";
import { boolean, check, pgSchema, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const auth = pgSchema("auth");

export const authUsers = auth.table("users", {
  id: uuid("id").primaryKey(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    baseCurrency: text("base_currency").notNull().default("SEK"),
    locale: text("locale").notNull().default("en"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    isDemoUser: boolean("is_demo_user").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check("profiles_base_currency_iso3_check", sql`char_length(${table.baseCurrency}) = 3`),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
