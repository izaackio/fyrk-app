import { generateWeeklyNarrative } from "@/lib/ai/narrative";
import { weeklyNarrativeRequestSchema } from "@/lib/ai/schemas";
import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, weeklyNarrativeRequestSchema);

    const narrative = await generateWeeklyNarrative(authContext, payload.householdId);

    return successResponse({
      narrative: narrative.narrative,
      highlights: narrative.highlights,
      generatedAt: narrative.generatedAt,
      source: narrative.source,
      asOfWeek: narrative.asOfWeek,
      fromCache: narrative.fromCache,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
