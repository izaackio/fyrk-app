import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  lifeEventDetailQuerySchema,
  lifeEventPathParamsSchema,
} from "@/lib/validations/events";
import {
  errorResponse,
  parseRouteParams,
  parseWithSchema,
  successResponse,
} from "@/services/http";
import { eventService } from "@/services/event.service";

interface EventRouteContext {
  params: Promise<unknown> | unknown;
}

export async function GET(request: Request, context: EventRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, lifeEventPathParamsSchema);
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
      },
      lifeEventDetailQuerySchema,
    );
    const event = await eventService.get(authContext, params.id, query.householdId);

    return successResponse(event);
  } catch (error) {
    return errorResponse(error);
  }
}
