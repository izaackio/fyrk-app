import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { households } from "./households";
import { profiles } from "./profiles";
import { timelineEntries } from "./timeline_entries";

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    impactAnalysis: jsonb("impact_analysis").notNull().default(sql`'{}'::jsonb`),
    status: text("status").notNull().default("pending"),
    requiresApprovalFrom: uuid("requires_approval_from")
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),
    approvedBy: uuid("approved_by").array().notNull().default(sql`'{}'::uuid[]`),
    rejectedBy: uuid("rejected_by").references(() => profiles.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    timelineEntryId: uuid("timeline_entry_id").references(() => timelineEntries.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_proposals_household").on(table.householdId),
    index("idx_proposals_household_status").on(table.householdId, table.status),
    index("idx_proposals_created_by").on(table.createdBy),
    index("idx_proposals_resolved_at").on(table.resolvedAt),
    index("idx_proposals_timeline_entry").on(table.timelineEntryId),
    check(
      "proposals_category_check",
      sql`${table.category} in ('investment', 'insurance', 'debt', 'savings', 'other')`,
    ),
    check(
      "proposals_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected', 'withdrawn')`,
    ),
    check(
      "proposals_rejected_by_status_check",
      sql`${table.rejectedBy} is null or ${table.status} = 'rejected'`,
    ),
    check(
      "proposals_resolution_status_check",
      sql`(
        (${table.status} = 'pending' and ${table.resolvedAt} is null)
        or (${table.status} in ('approved', 'rejected', 'withdrawn') and ${table.resolvedAt} is not null)
      )`,
    ),
  ],
);

export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
