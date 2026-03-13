import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { reviewPathParamsSchema } from "@/lib/validations/reviews";
import { errorResponse, parseRouteParams, successResponse } from "@/services/http";
import { reviewService } from "@/services/review.service";

interface ReviewRouteContext {
  params: Promise<unknown> | unknown;
}

export async function GET(request: Request, context: ReviewRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, reviewPathParamsSchema);
    const review = await reviewService.getById(authContext, params.id);

    return successResponse(review);
  } catch (error) {
    return errorResponse(error);
  }
}
