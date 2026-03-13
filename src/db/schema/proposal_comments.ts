import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profiles";
import { proposals } from "./proposals";

export const proposalComments = pgTable(
  "proposal_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_comments_proposal").on(table.proposalId),
    index("idx_comments_user").on(table.userId),
    index("idx_comments_created_at").on(table.createdAt),
  ],
);

export type ProposalComment = typeof proposalComments.$inferSelect;
export type NewProposalComment = typeof proposalComments.$inferInsert;
