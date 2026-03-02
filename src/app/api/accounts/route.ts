import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { accountListQuerySchema, createAccountSchema } from "@/lib/validations/accounts";
import {
  errorResponse,
  parseJsonBody,
  parseWithSchema,
  successResponse,
} from "@/services/http";
import { accountService } from "@/services/account.service";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
      },
      accountListQuerySchema,
    );

    const accounts = await accountService.list(authContext, query.householdId);
    return successResponse(accounts);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "write");
    const authContext = await requireAuth();
    const payload = await parseJsonBody(request, createAccountSchema);
    const account = await accountService.create(authContext, payload);

    return successResponse(account, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
