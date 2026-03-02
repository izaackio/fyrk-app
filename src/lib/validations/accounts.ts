import { z } from "zod";

import {
  accountTransactionTypes,
  accountTypes,
  accountWrapperTypes,
} from "@/types/domain";

const uuidSchema = z.string().uuid();

const isoCurrencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/u, "Must be a valid ISO 4217 currency code");

const visibilityInputSchema = z
  .enum(["full", "amount_hidden", "private", "hidden"])
  .transform((value) => (value === "hidden" ? "amount_hidden" : value));

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Must be an ISO date (YYYY-MM-DD)");

export const accountPathParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const accountListQuerySchema = z
  .object({
    householdId: uuidSchema,
  })
  .strict();

export const createAccountSchema = z
  .object({
    householdId: uuidSchema,
    name: z.string().trim().min(1).max(120),
    providerId: z.string().trim().min(1).max(64),
    accountType: z.enum(accountTypes),
    wrapperType: z.enum(accountWrapperTypes).nullable().optional(),
    currency: isoCurrencySchema.default("SEK"),
    visibility: visibilityInputSchema.default("full"),
  })
  .strict();

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    visibility: visibilityInputSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const accountTransactionsQuerySchema = z
  .object({
    cursor: uuidSchema.optional(),
    limit: z.preprocess(
      (value) => {
        if (value === undefined || value === null || value === "") {
          return undefined;
        }

        if (typeof value === "string") {
          return Number.parseInt(value, 10);
        }

        return value;
      },
      z.number().int().min(1).max(200).default(50),
    ),
    type: z
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
        (value) => value.every((entry) => (accountTransactionTypes as readonly string[]).includes(entry)),
        {
          message: "One or more transaction types are invalid",
        },
      ),
    from: dateOnlySchema.optional(),
    to: dateOnlySchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "from must be before or equal to to",
        path: ["from"],
      });
    }
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountTransactionsQueryInput = z.infer<typeof accountTransactionsQuerySchema>;
