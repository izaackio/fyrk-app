import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { DEMO_CONTEXT_COOKIE } from "@/lib/demo";
import { errorResponse, successResponse } from "@/services/http";
import { privacyService } from "@/services/privacy.service";

export async function DELETE(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "privacy");
    const authContext = await requireAuth();
    const result = await privacyService.deleteAccount(authContext);
    const response = successResponse(result);

    response.cookies.delete(DEMO_CONTEXT_COOKIE);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
