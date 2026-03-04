import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { lifeEvents } from "./life_events";
import { profiles } from "./profiles";

export const playbookActions = pgTable(
  "playbook_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lifeEventId: uuid("life_event_id")
      .notNull()
      .references(() => lifeEvents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    priority: text("priority").notNull().default("medium"),
    sortOrder: integer("sort_order").notNull().default(0),
    assignedTo: uuid("assigned_to").references(() => profiles.id),
    status: text("status").notNull().default("pending"),
    estimatedImpactAmount: integer("estimated_impact_amount"),
    estimatedImpactDescription: text("estimated_impact_description"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completionNotes: text("completion_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_playbook_event").on(table.lifeEventId),
    index("idx_playbook_status").on(table.status),
    index("idx_playbook_assigned_to").on(table.assignedTo),
    index("idx_playbook_event_sort").on(table.lifeEventId, table.sortOrder),
    check(
      "playbook_actions_category_check",
      sql`${table.category} in ('financial', 'legal', 'insurance', 'tax', 'administrative')`,
    ),
    check(
      "playbook_actions_priority_check",
      sql`${table.priority} in ('critical', 'high', 'medium', 'low')`,
    ),
    check(
      "playbook_actions_status_check",
      sql`${table.status} in ('pending', 'in_progress', 'completed', 'skipped')`,
    ),
    check("playbook_actions_sort_order_non_negative_check", sql`${table.sortOrder} >= 0`),
  ],
);

export type PlaybookAction = typeof playbookActions.$inferSelect;
export type NewPlaybookAction = typeof playbookActions.$inferInsert;
