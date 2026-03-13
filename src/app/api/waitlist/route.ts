import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { waitlistSignupSchema } from "@/lib/validations/waitlist";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";
import { waitlistService } from "@/services/waitlist.service";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "auth");
    const payload = await parseJsonBody(request, waitlistSignupSchema);
    const result = await waitlistService.signup(payload);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
