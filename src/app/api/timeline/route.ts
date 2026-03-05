import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  createTimelineEntrySchema,
  timelineQuerySchema,
} from "@/lib/validations/timeline";
import {
  errorResponse,
  parseJsonBody,
  parseWithSchema,
  successResponse,
  successResponseWithMeta,
} from "@/services/http";
import { timelineService } from "@/services/timeline.service";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
        types: requestUrl.searchParams.get("types") ?? undefined,
        from: requestUrl.searchParams.get("from") ?? undefined,
        cursor: requestUrl.searchParams.get("cursor") ?? undefined,
        limit: requestUrl.searchParams.get("limit") ?? undefined,
      },
      timelineQuerySchema,
    );

    const result = await timelineService.list(authContext, query);
    return successResponseWithMeta(result.data, result.meta);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, createTimelineEntrySchema);
    const entry = await timelineService.create(authContext, payload);

    return successResponse(entry, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
