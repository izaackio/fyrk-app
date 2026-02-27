import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { authService } from "@/services/auth.service";
import { errorResponse, successResponse } from "@/services/http";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "auth");
    const authContext = await requireAuth();
    await authService.logout(authContext);

    return successResponse({ message: "Signed out" });
  } catch (error) {
    return errorResponse(error);
  }
}
