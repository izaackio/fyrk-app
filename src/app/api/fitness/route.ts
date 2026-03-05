import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { fitnessQuerySchema } from "@/lib/validations/fitness";
import { fitnessService } from "@/services/fitness.service";
import { errorResponse, parseWithSchema, successResponse } from "@/services/http";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
      },
      fitnessQuerySchema,
    );

    const result = await fitnessService.getFitness(authContext, query.householdId);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
