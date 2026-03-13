import { z } from "zod";

import { emailSchema } from "@/lib/validations/auth";

export const waitlistSignupSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export type WaitlistSignupInput = z.infer<typeof waitlistSignupSchema>;
