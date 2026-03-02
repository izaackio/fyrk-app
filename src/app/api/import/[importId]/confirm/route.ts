import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  importConfirmBodySchema,
  importConfirmPathParamsSchema,
} from "@/lib/validations/import";
import { ServiceError } from "@/services/errors";
import {
  errorResponse,
  parseJsonBody,
  parseRouteParams,
  successResponse,
} from "@/services/http";
import { importService } from "@/services/import.service";

interface ImportConfirmRouteContext {
  params: Promise<unknown> | unknown;
}

export async function POST(request: Request, context: ImportConfirmRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, importConfirmPathParamsSchema);
    const payload = await parseJsonBody(request, importConfirmBodySchema);

    if (payload.importId && payload.importId !== params.importId) {
      throw ServiceError.validation("Request body importId does not match URL");
    }

    const result = await importService.confirmImport(authContext, params.importId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
