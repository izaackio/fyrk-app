import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { createHouseholdSchema } from "@/lib/validations/household";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";
import { householdService } from "@/services/household.service";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, createHouseholdSchema);
    const household = await householdService.create(authContext, payload);

    return successResponse(household, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
