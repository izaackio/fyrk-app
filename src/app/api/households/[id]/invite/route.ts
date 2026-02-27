import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  householdPathParamsSchema,
  inviteHouseholdMemberSchema,
} from "@/lib/validations/household";
import { errorResponse, parseJsonBody, parseRouteParams, successResponse } from "@/services/http";
import { householdService } from "@/services/household.service";

interface HouseholdRouteContext {
  params: Promise<unknown> | unknown;
}

export async function POST(request: Request, context: HouseholdRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, householdPathParamsSchema);
    const payload = await parseJsonBody(request, inviteHouseholdMemberSchema);
    const invitation = await householdService.inviteMember(authContext, params.id, payload);

    return successResponse(invitation, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
