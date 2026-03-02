import { requireAuth } from "@/lib/auth/middleware";
import { enforceRateLimit } from "@/lib/auth/rate-limit";
import { balanceSheetHistoryQuerySchema } from "@/lib/validations/balance-sheet";
import { balanceSheetService } from "@/services/balance-sheet.service";
import { errorResponse, parseWithSchema, successResponse } from "@/services/http";

export async function GET(request: Request): Promise<Response> {
  try {
    enforceRateLimit(request, "read");
    const authContext = await requireAuth();
    const requestUrl = new URL(request.url);
    const query = parseWithSchema(
      {
        householdId: requestUrl.searchParams.get("householdId") ?? undefined,
        period: requestUrl.searchParams.get("period") ?? undefined,
      },
      balanceSheetHistoryQuerySchema,
    );
    const history = await balanceSheetService.getHistory(authContext, query);

    return successResponse(history);
  } catch (error) {
    return errorResponse(error);
  }
}
