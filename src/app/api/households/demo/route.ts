import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  DEMO_CONTEXT_COOKIE,
  buildDemoContextCookieValue,
  getDemoContextCookieOptions,
} from "@/lib/demo";
import { initializeDemoHouseholdSchema } from "@/lib/validations/household";
import { demoService } from "@/services/demo.service";
import { errorResponse, parseJsonBody, successResponse } from "@/services/http";

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "demo");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, initializeDemoHouseholdSchema);
    const demoHousehold = await demoService.initialize(authContext, payload.variant);
    const response = successResponse(demoHousehold, 201);

    response.cookies.set(
      DEMO_CONTEXT_COOKIE,
      buildDemoContextCookieValue({
        householdId: demoHousehold.id,
        variant: demoHousehold.demoVariant,
      }),
      getDemoContextCookieOptions(),
    );

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
