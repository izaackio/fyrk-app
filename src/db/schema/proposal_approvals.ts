import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { profiles } from "./profiles";
import { proposals } from "./proposals";

export const proposalApprovals = pgTable(
  "proposal_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    approverUserId: uuid("approver_user_id")
      .notNull()
      .references(() => profiles.id),
    status: text("status").notNull().default("pending"),
    decisionReason: text("decision_reason"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_proposal_approvals_proposal").on(table.proposalId),
    index("idx_proposal_approvals_approver").on(table.approverUserId),
    index("idx_proposal_approvals_status").on(table.status),
    unique("proposal_approvals_proposal_approver_uniq").on(table.proposalId, table.approverUserId),
    check(
      "proposal_approvals_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected')`,
    ),
    check(
      "proposal_approvals_decided_at_status_check",
      sql`(
        (${table.status} = 'pending' and ${table.decidedAt} is null)
        or (${table.status} in ('approved', 'rejected') and ${table.decidedAt} is not null)
      )`,
    ),
  ],
);

export type ProposalApproval = typeof proposalApprovals.$inferSelect;
export type NewProposalApproval = typeof proposalApprovals.$inferInsert;
