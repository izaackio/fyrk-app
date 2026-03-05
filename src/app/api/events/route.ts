import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { createLifeEventSchema } from "@/lib/validations/events";
import { eventService } from "@/services/event.service";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, createLifeEventSchema);
    const lifeEvent = await eventService.create(authContext, payload);

    return successResponse(lifeEvent, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
