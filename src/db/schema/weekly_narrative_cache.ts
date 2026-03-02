import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { households } from "./households";

export const weeklyNarrativeCache = pgTable(
  "weekly_narrative_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    asOfWeek: date("as_of_week").notNull(),
    contextHash: text("context_hash").notNull(),
    narrative: text("narrative").notNull(),
    highlights: jsonb("highlights").notNull().default(sql`'[]'::jsonb`),
    source: text("source").notNull().default("ai"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_narrative_cache_household_week_uniq").on(table.householdId, table.asOfWeek),
    index("idx_weekly_narrative_cache_household_week").on(table.householdId, table.asOfWeek),
    index("idx_weekly_narrative_cache_generated_at").on(table.generatedAt),
    check("weekly_narrative_cache_source_check", sql`${table.source} in ('ai', 'fallback')`),
  ],
);

export type WeeklyNarrativeCache = typeof weeklyNarrativeCache.$inferSelect;
export type NewWeeklyNarrativeCache = typeof weeklyNarrativeCache.$inferInsert;
