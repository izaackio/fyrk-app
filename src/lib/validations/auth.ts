import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1)
  .max(320)
  .email()
  .transform((value) => value.toLowerCase());

export const authEmailRequestSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export type AuthEmailRequest = z.infer<typeof authEmailRequestSchema>;
