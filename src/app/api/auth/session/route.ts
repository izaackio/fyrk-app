import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { authService } from "@/services/auth.service";
import { errorResponse, successResponse } from "@/services/http";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const session = await authService.getSession(authContext);

    return successResponse(session);
  } catch (error) {
    return errorResponse(error);
  }
}
