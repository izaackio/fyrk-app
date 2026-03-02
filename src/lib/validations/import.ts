import { z } from "zod";

const uuidSchema = z.string().uuid();

const importPreviewFormats = ["avanza", "nordnet"] as const;

export const importConfirmPathParamsSchema = z
  .object({
    importId: uuidSchema,
  })
  .strict();

export const importConfirmBodySchema = z
  .object({
    importId: uuidSchema.optional(),
  })
  .strict();

export const importCsvFormSchema = z
  .object({
    accountId: uuidSchema,
    format: z.enum(importPreviewFormats),
    fileName: z.string().trim().min(1).max(256),
  })
  .strict();

export type ImportConfirmBodyInput = z.infer<typeof importConfirmBodySchema>;
export type ImportCsvFormInput = z.infer<typeof importCsvFormSchema>;
