import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { households } from "./households";
import { profiles } from "./profiles";
import { timelineEntries } from "./timeline_entries";

export const lifeEvents = pgTable(
  "life_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    triggeredBy: uuid("triggered_by")
      .notNull()
      .references(() => profiles.id),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("active"),
    inputs: jsonb("inputs").notNull().default(sql`'{}'::jsonb`),
    impactSummary: text("impact_summary"),
    impactData: jsonb("impact_data"),
    targetDate: date("target_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    timelineEntryId: uuid("timeline_entry_id").references(() => timelineEntries.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_life_events_household").on(table.householdId),
    index("idx_life_events_status").on(table.status),
    index("idx_life_events_event_type").on(table.eventType),
    index("idx_life_events_target_date").on(table.targetDate),
    check(
      "life_events_event_type_check",
      sql`${table.eventType} in ('buying_apartment', 'having_child', 'changing_jobs', 'inheritance', 'retirement', 'marriage', 'divorce')`,
    ),
    check("life_events_status_check", sql`${table.status} in ('active', 'completed', 'cancelled')`),
  ],
);

export type LifeEvent = typeof lifeEvents.$inferSelect;
export type NewLifeEvent = typeof lifeEvents.$inferInsert;
