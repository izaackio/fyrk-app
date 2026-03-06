import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { reviewListQuerySchema } from "@/lib/validations/reviews";
import { errorResponse, parseWithSchema, successResponse } from "@/services/http";
import { reviewService } from "@/services/review.service";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
      },
      reviewListQuerySchema,
    );

    const reviews = await reviewService.list(authContext, query.householdId);
    return successResponse(reviews);
  } catch (error) {
    return errorResponse(error);
  }
}
