import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  householdMemberPathParamsSchema,
  updateHouseholdMemberSchema,
} from "@/lib/validations/household";
import { errorResponse, parseJsonBody, parseRouteParams, successResponse } from "@/services/http";
import { householdService } from "@/services/household.service";

interface HouseholdMemberRouteContext {
  params: Promise<unknown> | unknown;
}

export async function PATCH(request: Request, context: HouseholdMemberRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, householdMemberPathParamsSchema);
    const payload = await parseJsonBody(request, updateHouseholdMemberSchema);
    const member = await householdService.updateMember(
      authContext,
      params.id,
      params.memberId,
      payload,
    );

    return successResponse(member);
  } catch (error) {
    return errorResponse(error);
  }
}
