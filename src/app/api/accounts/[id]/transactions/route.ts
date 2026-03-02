import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import {
  accountPathParamsSchema,
  accountTransactionsQuerySchema,
} from "@/lib/validations/accounts";
import {
  errorResponse,
  parseRouteParams,
  parseWithSchema,
  successResponseWithMeta,
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
    const requestUrl = new URL(request.url);

    const query = parseWithSchema(
      {
        cursor: requestUrl.searchParams.get("cursor") ?? undefined,
        limit: requestUrl.searchParams.get("limit") ?? undefined,
        type: requestUrl.searchParams.get("type") ?? undefined,
        from: requestUrl.searchParams.get("from") ?? undefined,
        to: requestUrl.searchParams.get("to") ?? undefined,
      },
      accountTransactionsQuerySchema,
    );

    const result = await accountService.getTransactions(authContext, params.id, query);
    return successResponseWithMeta(result.data, result.meta);
  } catch (error) {
    return errorResponse(error);
  }
}
