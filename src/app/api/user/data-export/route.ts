import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { errorResponse, successResponse } from "@/services/http";
import { privacyService } from "@/services/privacy.service";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "privacy");
    const authContext = await requireAuth();
    const exportPayload = await privacyService.exportUserData(authContext);

    return successResponse(exportPayload);
  } catch (error) {
    return errorResponse(error);
  }
}
