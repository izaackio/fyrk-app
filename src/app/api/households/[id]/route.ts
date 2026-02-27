import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { householdPathParamsSchema } from "@/lib/validations/household";
import { errorResponse, parseRouteParams, successResponse } from "@/services/http";
import { householdService } from "@/services/household.service";

interface HouseholdRouteContext {
  params: Promise<unknown> | unknown;
}

export async function GET(request: Request, context: HouseholdRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, householdPathParamsSchema);
    const household = await householdService.getById(authContext, params.id);

    return successResponse(household);
  } catch (error) {
    return errorResponse(error);
  }
}
