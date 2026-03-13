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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { households } from "./households";

export const fitnessScores = pgTable(
  "fitness_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    totalScore: integer("total_score").notNull(),
    bufferScore: integer("buffer_score").notNull(),
    growthScore: integer("growth_score").notNull(),
    protectionScore: integer("protection_score").notNull(),
    efficiencyScore: integer("efficiency_score").notNull(),
    trajectoryScore: integer("trajectory_score").notNull(),
    componentDetails: jsonb("component_details").notNull().default(sql`'{}'::jsonb`),
    explanation: text("explanation"),
    suggestedActions: jsonb("suggested_actions").notNull().default(sql`'[]'::jsonb`),
    calculatedAt: date("calculated_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_fitness_household").on(table.householdId),
    index("idx_fitness_date").on(table.calculatedAt),
    uniqueIndex("idx_fitness_household_date").on(table.householdId, table.calculatedAt),
    check("fitness_scores_total_score_range_check", sql`${table.totalScore} between 0 and 1000`),
    check("fitness_scores_buffer_score_range_check", sql`${table.bufferScore} between 0 and 200`),
    check("fitness_scores_growth_score_range_check", sql`${table.growthScore} between 0 and 200`),
    check(
      "fitness_scores_protection_score_range_check",
      sql`${table.protectionScore} between 0 and 200`,
    ),
    check(
      "fitness_scores_efficiency_score_range_check",
      sql`${table.efficiencyScore} between 0 and 200`,
    ),
    check(
      "fitness_scores_trajectory_score_range_check",
      sql`${table.trajectoryScore} between 0 and 200`,
    ),
    check(
      "fitness_scores_component_total_check",
      sql`${table.totalScore} = (${table.bufferScore} + ${table.growthScore} + ${table.protectionScore} + ${table.efficiencyScore} + ${table.trajectoryScore})`,
    ),
  ],
);

export type FitnessScore = typeof fitnessScores.$inferSelect;
export type NewFitnessScore = typeof fitnessScores.$inferInsert;
