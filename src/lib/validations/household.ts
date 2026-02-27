import { z } from "zod";

import { emailSchema } from "@/lib/validations/auth";
import { householdManageableRoles } from "@/types/domain";

const uuidSchema = z.string().uuid();

const isoCurrencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/u, "Must be a valid ISO 4217 currency code");

export const householdPathParamsSchema = z
  .object({
    id: uuidSchema,
  })
  .strict();

export const householdMemberPathParamsSchema = z
  .object({
    id: uuidSchema,
    memberId: uuidSchema,
  })
  .strict();

export const createHouseholdSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    baseCurrency: isoCurrencySchema.default("SEK"),
  })
  .strict();

export const inviteHouseholdMemberSchema = z
  .object({
    email: emailSchema,
    role: z.enum(householdManageableRoles).default("member"),
  })
  .strict();

const roleUpdateSchema = z
  .object({
    role: z.enum(householdManageableRoles),
  })
  .strict();

const removeMemberSchema = z
  .object({
    status: z.literal("removed"),
  })
  .strict();

export const updateHouseholdMemberSchema = z.union([roleUpdateSchema, removeMemberSchema]);

export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type InviteHouseholdMemberInput = z.infer<typeof inviteHouseholdMemberSchema>;
export type UpdateHouseholdMemberInput = z.infer<typeof updateHouseholdMemberSchema>;
