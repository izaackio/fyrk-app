import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { eventService } from "@/services/event.service";
import { errorResponse, successResponse } from "@/services/http";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    await requireAuth();
    const library = await eventService.getLibrary();

    return successResponse(library);
  } catch (error) {
    return errorResponse(error);
  }
}
