import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { accountPathParamsSchema } from "@/lib/validations/accounts";
import { errorResponse, parseRouteParams, successResponse } from "@/services/http";
import { accountService } from "@/services/account.service";

interface AccountRouteContext {
  params: Promise<unknown> | unknown;
}

export async function GET(request: Request, context: AccountRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, accountPathParamsSchema);
    const holdings = await accountService.getHoldings(authContext, params.id);

    return successResponse(holdings);
  } catch (error) {
    return errorResponse(error);
  }
}
