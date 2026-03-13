import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { households } from "./households";
import { timelineEntries } from "./timeline_entries";

export const quarterlyReviews = pgTable(
  "quarterly_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    quarterLabel: text("quarter_label").notNull(),
    netWorthStart: integer("net_worth_start").notNull(),
    netWorthEnd: integer("net_worth_end").notNull(),
    netWorthChange: integer("net_worth_change").notNull(),
    marketReturnsAmount: integer("market_returns_amount").notNull().default(0),
    netSavingsAmount: integer("net_savings_amount").notNull().default(0),
    debtReductionAmount: integer("debt_reduction_amount").notNull().default(0),
    feesDragAmount: integer("fees_drag_amount").notNull().default(0),
    narrative: text("narrative"),
    recommendations: jsonb("recommendations").notNull().default(sql`'[]'::jsonb`),
    fitnessScore: integer("fitness_score"),
    fitnessComponents: jsonb("fitness_components"),
    upcomingEvents: jsonb("upcoming_events").notNull().default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("draft"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    timelineEntryId: uuid("timeline_entry_id").references(() => timelineEntries.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_reviews_household").on(table.householdId),
    index("idx_reviews_household_period").on(table.householdId, table.periodEnd),
    index("idx_reviews_status").on(table.status),
    index("idx_reviews_timeline_entry").on(table.timelineEntryId),
    check("quarterly_reviews_period_check", sql`${table.periodEnd} >= ${table.periodStart}`),
    check(
      "quarterly_reviews_status_check",
      sql`${table.status} in ('draft', 'published', 'archived')`,
    ),
  ],
);

export type QuarterlyReview = typeof quarterlyReviews.$inferSelect;
export type NewQuarterlyReview = typeof quarterlyReviews.$inferInsert;
