import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { authEmailRequestSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "auth");
    const payload = await parseJsonBody(request, authEmailRequestSchema);
    const result = await authService.login(payload.email);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
