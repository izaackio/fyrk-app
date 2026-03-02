import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { importCsvFormSchema } from "@/lib/validations/import";
import { ServiceError } from "@/services/errors";
import { errorResponse, parseWithSchema, successResponse } from "@/services/http";
import { importService } from "@/services/import.service";

function readStringField(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw ServiceError.validation("CSV file is required");
    }

    const payload = parseWithSchema(
      {
        accountId: readStringField(formData.get("accountId")),
        format: readStringField(formData.get("format")),
        fileName: file.name,
      },
      importCsvFormSchema,
    );

    const csvText = await file.text();

    if (csvText.trim().length === 0) {
      throw ServiceError.validation("CSV file is empty");
    }

    const preview = await importService.previewCsv(authContext, {
      accountId: payload.accountId,
      format: payload.format,
      fileName: payload.fileName,
      csvText,
    });

    return successResponse(preview);
  } catch (error) {
    return errorResponse(error);
  }
}
