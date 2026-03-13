import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  createLifeEventSchema,
  lifeEventListQuerySchema,
} from "@/lib/validations/events";
import { eventService } from "@/services/event.service";
import {
  errorResponse,
  parseJsonBody,
  parseWithSchema,
  successResponse,
} from "@/services/http";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
      },
      lifeEventListQuerySchema,
    );
    const events = await eventService.list(authContext, query.householdId);

    return successResponse(events);
  } catch (error) {
    return errorResponse(error);
  }
}

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
