import { z } from "zod";

import { proposalCategories, proposalStatuses } from "@/types/domain";

const uuidSchema = z.string().uuid();
const proposalStatusSchema = z.enum(proposalStatuses);

export const proposalPathParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const createProposalSchema = z
  .object({
    householdId: uuidSchema,
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(4000),
    category: z.enum(proposalCategories),
  })
  .strict();

export const proposalListQuerySchema = z
  .object({
    householdId: uuidSchema,
    status: z
      .string()
      .trim()
      .optional()
      .transform((value) => {
        if (!value) {
          return [];
        }

        return value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      })
      .refine(
        (value) => value.every((entry) => (proposalStatuses as readonly string[]).includes(entry)),
        {
          message: "One or more proposal statuses are invalid",
        },
      ),
  })
  .strict();

export const proposalRejectSchema = z
  .object({
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();

export const proposalCommentSchema = z
  .object({
    content: z.string().trim().min(1).max(4000),
  })
  .strict();

export const proposalStatusMutationSchema = z
  .object({
    status: proposalStatusSchema,
  })
  .strict();

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type ProposalListQueryInput = z.infer<typeof proposalListQuerySchema>;
export type ProposalRejectInput = z.infer<typeof proposalRejectSchema>;
export type ProposalCommentInput = z.infer<typeof proposalCommentSchema>;
