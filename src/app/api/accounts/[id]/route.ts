import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { accountPathParamsSchema, updateAccountSchema } from "@/lib/validations/accounts";
import {
  errorResponse,
  parseJsonBody,
  parseRouteParams,
  successResponse,
} from "@/services/http";
import { accountService } from "@/services/account.service";

interface AccountRouteContext {
  params: Promise<unknown> | unknown;
}

export async function GET(request: Request, context: AccountRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, accountPathParamsSchema);
    const account = await accountService.getById(authContext, params.id);

    return successResponse(account);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: AccountRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, accountPathParamsSchema);
    const payload = await parseJsonBody(request, updateAccountSchema);
    const account = await accountService.update(authContext, params.id, payload);

    return successResponse(account);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: AccountRouteContext): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const params = await parseRouteParams(context.params, accountPathParamsSchema);
    const result = await accountService.remove(authContext, params.id);

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
