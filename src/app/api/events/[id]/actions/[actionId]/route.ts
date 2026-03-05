import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  playbookActionPathParamsSchema,
  updatePlaybookActionSchema,
} from "@/lib/validations/events";
import { eventService } from "@/services/event.service";
import {
  errorResponse,
  parseJsonBody,
  parseRouteParams,
  successResponse,
} from "@/services/http";

interface EventActionRouteContext {
  params: Promise<unknown> | unknown;
}

export async function PATCH(request: Request, context: EventActionRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, playbookActionPathParamsSchema);
    const payload = await parseJsonBody(request, updatePlaybookActionSchema);
    const action = await eventService.updateAction(authContext, params.id, params.actionId, payload);

    return successResponse(action);
  } catch (error) {
    return errorResponse(error);
  }
}
