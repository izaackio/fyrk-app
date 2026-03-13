import { sql } from "drizzle-orm";
import {
  boolean,
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

export const timelineEntries = pgTable(
  "timeline_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    entryType: text("entry_type").notNull(),
    category: text("category"),
    title: text("title").notNull(),
    description: text("description"),
    reasoning: text("reasoning"),
    expectedOutcome: text("expected_outcome"),
    linkedAccountIds: uuid("linked_account_ids").array(),
    linkedProposalId: uuid("linked_proposal_id"),
    linkedReviewId: uuid("linked_review_id"),
    linkedEventId: uuid("linked_event_id"),
    entryDate: date("entry_date").notNull(),
    isFuture: boolean("is_future").notNull().default(false),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_timeline_household").on(table.householdId),
    index("idx_timeline_household_date_id_active")
      .on(table.householdId, table.entryDate.desc(), table.id.desc())
      .where(sql`${table.deletedAt} is null`),
    index("idx_timeline_date").on(table.entryDate),
    index("idx_timeline_type").on(table.entryType),
    index("idx_timeline_created_by").on(table.createdBy),
    index("idx_timeline_linked_proposal").on(table.linkedProposalId),
    index("idx_timeline_linked_review").on(table.linkedReviewId),
    check(
      "timeline_entries_entry_type_check",
      sql`${table.entryType} in ('life_event', 'decision', 'milestone', 'review', 'system', 'note')`,
    ),
    check(
      "timeline_entries_category_check",
      sql`${table.category} is null or ${table.category} in ('housing', 'family', 'career', 'investment', 'retirement', 'other')`,
    ),
  ],
);

export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type NewTimelineEntry = typeof timelineEntries.$inferInsert;
