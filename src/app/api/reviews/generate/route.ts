import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { generateReviewSchema } from "@/lib/validations/reviews";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";
import { reviewService } from "@/services/review.service";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, generateReviewSchema);
    const result = await reviewService.generate(authContext, payload);

    return successResponse(result, 202);
  } catch (error) {
    return errorResponse(error);
  }
}
