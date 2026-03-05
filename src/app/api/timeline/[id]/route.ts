import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  timelinePathParamsSchema,
  updateTimelineEntrySchema,
} from "@/lib/validations/timeline";
import {
  errorResponse,
  parseJsonBody,
  parseRouteParams,
  successResponse,
} from "@/services/http";
import { timelineService } from "@/services/timeline.service";

interface TimelineRouteContext {
  params: Promise<unknown> | unknown;
}

export async function PATCH(request: Request, context: TimelineRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, timelinePathParamsSchema);
    const payload = await parseJsonBody(request, updateTimelineEntrySchema);
    const entry = await timelineService.update(authContext, params.id, payload);

    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: TimelineRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, timelinePathParamsSchema);
    const result = await timelineService.remove(authContext, params.id);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
